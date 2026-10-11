import argparse
import asyncio
import logging
import pathlib
from importlib import resources
from importlib.metadata import entry_points
from os import PathLike, fspath
from types import SimpleNamespace
from typing import Any

from aiohttp import web

from ..backends import getFileSystemBackend
from ..core.fonthandler import FontHandler
from ..core.protocols import ExportManager, ProjectManager, ProjectOpenListener
from .exportmanager import EngramFontExportManager

logger = logging.getLogger(__name__)


fileExtensions = {
    f".{ep.name}" for ep in entry_points(group="fontra.filesystem.backends")
}


class FileSystemProjectManagerFactory:
    @staticmethod
    def addArguments(parser: argparse.ArgumentParser) -> None:
        parser.add_argument(
            "path",
            type=existingFolderOrFontFile,
            help="A path to an folder containing font files, or a path to a "
            "single font file. Alternatively you can pass the special value "
            "'-' to bypass the landing page, and use a full OS FS path as part "
            "of the view URL.",
        )
        parser.add_argument("--max-folder-depth", type=int, default=3)
        parser.add_argument("--read-only", action="store_true")

    @staticmethod
    def getProjectManager(arguments: SimpleNamespace) -> ProjectManager:
        projectManager = FileSystemProjectManager(
            rootPath=arguments.path,
            maxFolderDepth=arguments.max_folder_depth,
            readOnly=arguments.read_only,
        )
        projectManager.exportManager = EngramFontExportManager(projectManager)
        return projectManager


def existingFolderOrFontFile(path):
    if path == "-":
        return None
    path = pathlib.Path(path).resolve()
    ext = path.suffix.lower()
    if ext not in fileExtensions and not path.is_dir():
        raise argparse.ArgumentError(None, "invalid path")
    return path


class FileSystemProjectManager:
    def __init__(
        self,
        rootPath: pathlib.Path | None = None,
        maxFolderDepth: int = 3,
        readOnly: bool = False,
        exportManager: ExportManager | None = None,
        projectOpenListener: ProjectOpenListener | None = None,
    ):
        self.rootPath = rootPath
        self.singleFilePath = None
        self.maxFolderDepth = maxFolderDepth
        self.readOnly = readOnly
        if self.rootPath is not None and self.rootPath.suffix.lower() in fileExtensions:
            self.singleFilePath = self.rootPath
            self.rootPath = self.rootPath.parent
        self.fontHandlers: dict[str, FontHandler] = {}
        self.exportManager = exportManager
        self.projectOpenListener = projectOpenListener

    async def aclose(self) -> None:
        for fontHandler in self.fontHandlers.values():
            await fontHandler.aclose()

    async def authorize(self, request: web.Request) -> str:
        return "yes"  # arbitrary non-false string token

    async def rootDocumentHandler(self, request: web.Request) -> web.Response:
        htmlPath = resources.files("fontra") / "client" / "landing.html"
        html = htmlPath.read_bytes()
        return web.Response(body=html, content_type="text/html")

    async def projectAvailable(self, projectIdentifier: str, token: str) -> bool:
        return bool(self._getProjectPath(projectIdentifier))

    async def getRemoteSubject(
        self, projectIdentifier: str, token: str, readOnly: bool = False
    ) -> FontHandler:
        fontHandler = self.fontHandlers.get(projectIdentifier)
        if fontHandler is None:
            projectPath = self._getProjectPath(projectIdentifier)
            if projectPath is None:
                raise FileNotFoundError(projectPath)
            backend = getFileSystemBackend(projectPath)

            async def closeFontHandler():
                logger.info(f"closing FontHandler for '{projectIdentifier}'")
                del self.fontHandlers[projectIdentifier]
                assert fontHandler is not None
                await fontHandler.aclose()
                if self.projectOpenListener is not None:
                    self.projectOpenListener.projectClosed(projectIdentifier)

            logger.info(f"new FontHandler for '{projectIdentifier}'")
            fontHandler = FontHandler(
                backend=backend,
                projectIdentifier=fspath(projectPath),
                metaInfoProvider=self,
                exportManager=self.exportManager,
                readOnly=self.readOnly or readOnly,
                allConnectionsClosedCallback=closeFontHandler,
            )
            await fontHandler.startTasks()
            self.fontHandlers[projectIdentifier] = fontHandler
            if self.projectOpenListener is not None:
                self.projectOpenListener.projectOpened(projectIdentifier)
        return fontHandler

    def _getProjectPath(self, path: str) -> PathLike | None:
        if self.rootPath is None:
            projectPath = pathlib.Path(path)
            if not projectPath.is_absolute():
                projectPath = "/" / projectPath
        else:
            projectPath = self.rootPath.joinpath(*path.split("/"))

        if projectPath.suffix.lower() in fileExtensions and projectPath.exists():
            return projectPath
        return None

    async def getProjectList(self, token: str) -> list[str]:
        if self.rootPath is None:
            return []
        projectPaths = []
        rootItems = self.rootPath.parts
        if self.singleFilePath is not None:
            paths = [self.singleFilePath]
        else:
            paths = sorted(
                _iterFolder(self.rootPath, fileExtensions, self.maxFolderDepth)
            )
        for projectPath in paths:
            projectItems = projectPath.parts
            assert projectItems[: len(rootItems)] == rootItems
            projectPaths.append("/".join(projectItems[len(rootItems) :]))
        return projectPaths

    def setupWebRoutes(self, server):
        if self.exportManager is not None and hasattr(
            self.exportManager, "setupWebRoutes"
        ):
            self.exportManager.setupWebRoutes(server)
        # registered before the server's /api/{function:.*} route -> wins
        server.httpApp.router.add_post("/api/import-font", self.importFontHandler)

    async def importFontHandler(self, request: web.Request) -> web.Response:
        from .importfont import (
            FontImportError,
            importFontToProject,
            maxImportFileSize,
            sanitizeImportName,
        )

        if self.rootPath is None:
            return web.json_response(
                {"error": "import requires a project folder"}, status=400
            )
        if not await self.authorize(request):
            raise web.HTTPUnauthorized()
        try:
            post = await request.post()
        except FontImportError as error:
            return web.json_response({"error": str(error)}, status=error.status)

        upload = post.get("file")
        if upload is None or not upload.filename:
            return web.json_response({"error": "no file"}, status=400)
        data = upload.file.read()
        if len(data) > maxImportFileSize:
            return web.json_response({"error": "file too large"}, status=400)

        sourceExt = pathlib.Path(upload.filename).suffix.lower()
        if sourceExt not in fileExtensions - {".fontra"}:
            return web.json_response({"error": "unsupported"}, status=400)

        baseName = sanitizeImportName(post.get("name") or upload.filename)
        stem = pathlib.Path(baseName).stem
        projectIdentifier = f"{stem}.fontra"
        projectPath = self.rootPath / projectIdentifier
        if projectPath.exists():
            return web.json_response(
                {"error": "name exists", "suggestion": f"{stem}-imported.fontra"},
                status=409,
            )

        sourcePath = self.rootPath / f"{stem}{sourceExt}"
        sourcePath.write_bytes(data)
        try:
            await importFontToProject(sourcePath, projectPath)
        except FontImportError as error:
            message, status = str(error), error.status
            error = None
            # the failing font's file handle can outlive the request briefly;
            # clean up in the background so the 400 isn't delayed
            asyncio.get_running_loop().create_task(_unlinkWithRetry(sourcePath))
            return web.json_response({"error": message}, status=status)
        return web.json_response({"project": projectIdentifier})

    async def getMetaInfo(
        self, projectIdentifier: str, authorizationToken: str
    ) -> dict[str, Any]:
        return {
            "projectName": projectIdentifier.split("/")[-1],
            "projectIdentifier": projectIdentifier,
        }

    async def putMetaInfo(
        self, projectIdentifier: str, metaInfo: dict[str, Any], authorizationToken: str
    ) -> None:
        pass


async def _unlinkWithRetry(path, attempts=20, delay=0.25):
    # fresh files can be transiently locked (font handles, AV scan) on Windows;
    # cleanup is best-effort — the import error response is what matters
    for attempt in range(attempts):
        try:
            path.unlink(missing_ok=True)
            return
        except PermissionError:
            if attempt == attempts - 1:
                logger.warning(f"could not remove {path} after import failure")
            else:
                await asyncio.sleep(delay)


def _iterFolder(folderPath, extensions, maxDepth=3):
    if maxDepth is not None and maxDepth <= 0:
        return
    try:
        for childPath in folderPath.iterdir():
            if childPath.name.startswith("."):
                # hidden folders (.exports, .git, ...) are not projects
                continue
            if childPath.suffix.lower() in extensions:
                yield childPath
            elif childPath.is_dir():
                yield from _iterFolder(
                    childPath,
                    extensions,
                    maxDepth - 1 if maxDepth is not None else None,
                )
    except PermissionError:
        logger.info(f"Skipping {str(folderPath)!r} (no permission)")
