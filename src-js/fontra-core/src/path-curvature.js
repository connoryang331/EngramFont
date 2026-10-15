/**
 * g2.js - "super-smooth" (curvature-continuous, G2) nodes for cubic Bezier outlines.
 * Pure JavaScript, no dependencies, no classes. See notes for the derivation.
 * Convention: segment = [p0,p1,p2,p3], p0/p3 on-curve, p1/p2 off-curve handles.
 * Handle at p0 is p1; handle at p3 is p2.
 * Around node P:  left = [A,hA,X,P],  right = [P,Y,hC,C];  X and Y are the unknowns.
 */

const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y});
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const mul=(a,s)=>({x:a.x*s,y:a.y*s});
const dot=(a,b)=>a.x*b.x+a.y*b.y;
const cross=(a,b)=>a.x*b.y-a.y*b.x;
const len2=(a)=>a.x*a.x+a.y*a.y;
const len=(a)=>Math.hypot(a.x,a.y);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const rot90=(v)=>({x:-v.y,y:v.x});
function norm(v){const l=Math.hypot(v.x,v.y);return l>0&&Number.isFinite(l)?{x:v.x/l,y:v.y/l}:{x:0,y:0};}
const finitePt=(p)=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
function closeTo(a,b,rt,at){const dx=Math.abs(a.x-b.x),dy=Math.abs(a.y-b.y);return dx<=at+rt*Math.max(Math.abs(a.x),Math.abs(b.x))&&dy<=at+rt*Math.max(Math.abs(a.y),Math.abs(b.y));}

function bezDeriv1(seg,t){const[p0,p1,p2,p3]=seg,u=1-t;return{x:3*(u*u*(p1.x-p0.x)+2*u*t*(p2.x-p1.x)+t*t*(p3.x-p2.x)),y:3*(u*u*(p1.y-p0.y)+2*u*t*(p2.y-p1.y)+t*t*(p3.y-p2.y))};}
function bezDeriv2(seg,t){const[p0,p1,p2,p3]=seg,u=1-t;return{x:6*(u*(p2.x-2*p1.x+p0.x)+t*(p3.x-2*p2.x+p1.x)),y:6*(u*(p2.y-2*p1.y+p0.y)+t*(p3.y-2*p2.y+p1.y))};}

// Curvature VECTOR = k * leftNormal(v) (points toward centre of curvature). NOT k*unitTangent.
function curvatureAt(seg,t){const v=bezDeriv1(seg,t),a=bezDeriv2(seg,t),q=len2(v);if(!(q>0)||!Number.isFinite(q))return{k:0,vec:{x:0,y:0},mag:0,degenerate:true};const k=cross(v,a)/Math.pow(q,1.5);const inv=1/Math.sqrt(q);const n=rot90({x:v.x*inv,y:v.y*inv});return{k,vec:{x:k*n.x,y:k*n.y},mag:Math.abs(k),degenerate:false};}
function unitTangentAt(seg,t){return norm(bezDeriv1(seg,t));}
const chordLen=(seg)=>dist(seg[0],seg[3]);
// NOTE: cross() returns a SCALAR, so take abs() directly -- calling len() on a scalar
// silently yields NaN and would make every straight segment test fail.
function isStraightSegment(seg,epsRel=1e-9){const L=Math.max(chordLen(seg),1e-12),tol=epsRel*L,d=sub(seg[3],seg[0]);return Math.abs(cross(sub(seg[1],seg[0]),d))<=tol&&Math.abs(cross(sub(seg[2],seg[0]),d))<=tol;}
function hasStraightEndpoint(seg,t,epsRel=1e-9){const[p0,p1,p2,p3]=seg;const u=t===0?sub(p1,p0):sub(p2,p1);const w=t===0?sub(p2,p1):sub(p3,p2);const lu=len(u),lw=len(w);if(!(Math.max(lu,lw)>0))return false;const s=Math.max(lu,lw);return Math.abs(cross(u,w))<=epsRel*s*s&&Math.abs(lu-lw)<=epsRel*s;}

function bendSenseProduct(left,right,P,n,tol=1e-9){const a=cross(n,sub(left[1],P)),c=cross(n,sub(right[2],P));const s=Math.max(Math.abs(a),Math.abs(c),1e-300);if(Math.abs(a)<=tol*s||Math.abs(c)<=tol*s)return 0;return Math.sign(a)*Math.sign(c);}

function isSuperSmoothSupported(node,left,right,opts={}){
  const posTol=opts.posTol!=null?opts.posTol:1e-7,angleTol=opts.angleTol!=null?opts.angleTol:1e-6,lineTol=opts.lineTol!=null?opts.lineTol:1e-9;
  if(!left||!right||left.length<4||right.length<4)return{kind:'invalid',supported:false,reason:'malformed segment',scale:0};
  const L=Math.max(chordLen(left),chordLen(right),1e-12),gap=dist(left[3],right[0]);
  if(!finitePt(left[3])||!finitePt(right[0])||!(gap<=posTol*L))return{kind:'invalid',supported:false,reason:'segments do not share an endpoint',gap,scale:L};
  const eL=curvatureAt(left,1),eR=curvatureAt(right,0);
  if(eL.degenerate||eR.degenerate)return{kind:'invalid',supported:false,reason:'degenerate tangent (zero-length handle at node)',scale:L};
  const leftStraight=isStraightSegment(left,lineTol),rightStraight=isStraightSegment(right,lineTol);
  let kind;if(leftStraight&&rightStraight)kind='line-line';else if(leftStraight)kind='line-curve';else if(rightStraight)kind='curve-line';else kind='curve-curve';
  const vL=sub(left[2],left[3]),vR=sub(right[1],right[0]);
  const sin2=(cross(vL,vR)*cross(vL,vR))/Math.max(len2(vL)*len2(vR),1e-300);
  const g1Ok=sin2<=angleTol*angleTol&&dot(norm(vL),norm(vR))>0;
  const res={kind,supported:true,scale:L,gap,g1Ok,sin2,kappaLeft:eL.mag,kappaRight:eR.mag,curvatureVectorJump:Math.hypot(eL.vec.x-eR.vec.x,eL.vec.y-eR.vec.y)};
  if(kind==='line-line'){res.alreadyG2=true;res.reason='both sides straight: curvature 0 on both sides, already G2';}
  else if(kind==='curve-curve'){const P=left[3],n=norm(add(norm(vL),norm(vR)));res.sameBendSense=bendSenseProduct(left,right,P,n,lineTol);res.supported=res.sameBendSense>0;res.reason=res.supported?'curve-curve: solvable in closed form (same bend sense)':'opposite bend senses; G2 impossible while keeping G1 (inflection)';}
  else{const straight=kind==='line-curve'?left:right,curve=kind==='line-curve'?right:left;const room=lineToCurveRoom(straight,curve,lineTol);res.room=room;res.hasRoom=room.enough;res.supported=true;res.reason=room.enough?'straight side long enough for the G2 transition':room.reason;}
  return res;
}

// Solve G2 with a fixed tangent n. Returns exact ratio b/a = sqrt(C_/A_), null if infeasible.
function solveAtDirection(left,right,P,n){
  const A=left[0],hA=left[1],hC=right[2],C=right[3];
  const A_=cross(n,sub(hA,P)),C_=cross(n,sub(hC,P));
  const ref=Math.max(Math.abs(A_),Math.abs(C_),1e-300);
  if(Math.abs(A_)<=1e-12*ref||Math.abs(C_)<=1e-12*ref)return null;
  if(A_*C_<=0)return null;
  const ratio=Math.sqrt(C_/A_);
  const budget0=len(sub(left[2],P))+len(sub(right[1],P));
  const budget=(budget0>1e-12&&Number.isFinite(budget0))?budget0:Math.max(chordLen(left),chordLen(right),1e-12);
  const a=budget/(1+ratio),b=budget*ratio/(1+ratio);
  if(!(a>0)||!(b>0)||!Number.isFinite(a)||!Number.isFinite(b))return null;
  const X={x:P.x-a*n.x,y:P.y-a*n.y},Y={x:P.x+b*n.x,y:P.y+b*n.y};
  const leftNew=[A,hA,X,P],rightNew=[P,Y,hC,C];
  const kL=curvatureAt(leftNew,1),kR=curvatureAt(rightNew,0);
  const dxL=sub(X,P),dxR=sub(Y,P);
  return{status:'ok',kind:'curve-curve',node:{x:P.x,y:P.y},handleLeft:X,handleRight:Y,tangent:n,
    curvature:{left:kL.mag,right:kR.mag,signedLeft:kL.k,signedRight:kR.k},
    segments:{left:leftNew,right:rightNew},
    diagnostics:{ratio,a,b,A_,C_,g1Residual:(cross(dxL,dxR)*cross(dxL,dxR))/Math.max(len2(dxL)*len2(dxR),1e-300),curvatureJump:Math.hypot(kL.vec.x-kR.vec.x,kL.vec.y-kR.vec.y)}};
}

function makeSuperSmoothCurveToCurve(node,left,right,opts={}){
  const lineTol=opts.lineTol!=null?opts.lineTol:1e-9,posTol=opts.posTol!=null?opts.posTol:1e-7;
  const P=finitePt(node)?{x:node.x,y:node.y}:null;
  if(!P||!finitePt(left[0])||!finitePt(left[1])||!finitePt(left[3])||!finitePt(right[1])||!finitePt(right[2])||!finitePt(right[3]))return{status:'invalid-input',kind:'invalid',reason:'non-finite or missing point'};
  const Lmax=Math.max(chordLen(left),chordLen(right),1e-12);
  if(dist(left[3],right[0])>posTol*Lmax)return{status:'invalid-input',kind:'invalid',reason:'segments do not share an endpoint'};
  if(dist(left[3],P)>posTol*Lmax||dist(right[0],P)>posTol*Lmax)return{status:'invalid-input',kind:'invalid',reason:'node does not coincide with the shared endpoint'};
  const A=left[0],hA=left[1],hC=right[2],C=right[3];
  const leftStraight=isStraightSegment(left,lineTol),rightStraight=isStraightSegment(right,lineTol);
  if(leftStraight&&rightStraight)return{status:'no-change',kind:'line-line',node:P,handleLeft:left[2],handleRight:right[1],reason:'both sides straight; already G2',diagnostics:{alreadyG2:true}};
  if(leftStraight)return{status:'route-to-line-curve',kind:'line-curve',node:P,reason:'left side is a straight line',handleLeft:left[2],handleRight:right[1]};
  if(rightStraight)return{status:'route-to-line-curve',kind:'curve-line',node:P,reason:'right side is a straight line',handleLeft:left[2],handleRight:right[1]};
  const rawL=sub(left[2],P),rawR=sub(right[1],P);
  // n = the FORWARD travel direction: it must point from the left side, through the node,
  // into the right side. Then X (the left handle at P) = P - a*n and Y (the right handle
  // at P) = P + b*n. Taking n from rawL directly would point BACKWARD and place the
  // handles on the wrong sides, so the left handle's contribution is negated.
  let n,nSrc;
  if(len(rawR)>0){n=norm(rawR);nSrc='right-handle';}
  else if(len(rawL)>0){n=norm(mul(rawL,-1));nSrc='left-handle(negated)';}
  else if(dist(C,P)>0){n=norm(sub(C,P));nSrc='chord-right';}
  else if(dist(A,P)>0){n=norm(sub(A,P));nSrc='chord-left';}
  else{n={x:1,y:0};nSrc='fallback';}
  const A_=cross(n,sub(hA,P)),C_=cross(n,sub(hC,P)),ref=Math.max(Math.abs(A_),Math.abs(C_),1e-300);
  if(Math.abs(A_)<=1e-12*ref||Math.abs(C_)<=1e-12*ref)return{status:'route-to-line-curve',kind:Math.abs(A_)<=Math.abs(C_)?'line-curve':'curve-line',node:P,reason:'one side has zero curvature at the node',handleLeft:left[2],handleRight:right[1]};
  if(A_*C_<=0)return{status:'infeasible',kind:'curve-curve',node:P,reason:'opposite bend senses; G2 impossible while preserving G1 (inflection)',handleLeft:left[2],handleRight:right[1],diagnostics:{A_,C_,product:A_*C_}};
  const ratio=Math.sqrt(C_/A_);
  const budget0=len(rawL)+len(rawR),budget=(budget0>1e-12&&Number.isFinite(budget0))?budget0:Lmax;
  const a=budget/(1+ratio),b=budget*ratio/(1+ratio);
  if(!Number.isFinite(a)||!Number.isFinite(b)||a<=0||b<=0)return{status:'degenerate',kind:'curve-curve',node:P,reason:'degenerate handle lengths',handleLeft:left[2],handleRight:right[1]};
  const X={x:P.x-a*n.x,y:P.y-a*n.y},Y={x:P.x+b*n.x,y:P.y+b*n.y};
  const leftNew=[A,hA,X,P],rightNew=[P,Y,hC,C];
  const kL=curvatureAt(leftNew,1),kR=curvatureAt(rightNew,0);
  const dxL=sub(X,P),dxR=sub(Y,P);
  // The `A_*C_>0` test above is necessary but NOT sufficient: a cusp -- equal
  // curvature magnitudes with the two sides bending opposite ways -- passes it
  // and yet leaves the curvature VECTOR jumping, i.e. it is not curvature
  // continuous. Reject it here, BEFORE any caller can write anything, so an
  // "ok" status can never come back on geometry that is not really G2.
  if(kL.vec.x*kR.vec.x+kL.vec.y*kR.vec.y<=0)
    return{status:'infeasible',kind:'curve-curve',node:P,
      reason:'cusp: equal curvature magnitudes on sides that bend opposite ways',
      handleLeft:left[2],handleRight:right[1],
      diagnostics:{A_,C_,product:A_*C_,kappaLeft:kL.mag,kappaRight:kR.mag}};
  return{status:'ok',kind:'curve-curve',node:P,handleLeft:X,handleRight:Y,tangent:n,
    curvature:{left:kL.mag,right:kR.mag,signedLeft:kL.k,signedRight:kR.k},
    segments:{left:leftNew,right:rightNew},
    diagnostics:{ratio,a,b,A_,C_,g1Residual:(cross(dxL,dxR)*cross(dxL,dxR))/Math.max(len2(dxL)*len2(dxR),1e-300),curvatureJump:Math.hypot(kL.vec.x-kR.vec.x,kL.vec.y-kR.vec.y),reconstructedTangent:nSrc,coincidentNeighbour:dist(A,P)<=1e-12*Lmax||dist(C,P)<=1e-12*Lmax}};
}

function lineToCurveRoom(straightSeg,curveSeg,lineTol=1e-9,order='line-curve'){
  if(!isStraightSegment(straightSeg,lineTol))return{enough:false,value:0,required:0,available:0,reason:'the given "straight" segment is not straight'};
  // The shared node sits at the END of the line. For 'line-curve' that node is the
  // curve's START (curve[0]) and its handle there is curve[1]; for 'curve-line' the node
  // is the curve's END (curve[3]) and its handle there is curve[2].
  const atStart = order!=='curve-line';
  const P   = atStart ? curveSeg[0] : curveSeg[3];
  const hFar= atStart ? curveSeg[2] : curveSeg[1];   // the next control point past the node
  const C   = curveSeg[atStart?3:0];                  // the curve's other on-curve point
  const required=0.5*dist(P,hFar),available=Math.max(chordLen(curveSeg),dist(P,C));
  const monotone=required<available*(1+1e-9)+1e-12;
  // A straight segment with essentially zero extent (chord vanishing against the local
  // scale) cannot host a transition. Compare the chord to the curve's own size so the
  // test is scale-relative and does not depend on where the origin happens to be.
  const straightLen=chordLen(straightSeg);
  const straightUsable=straightLen>1e-6*Math.max(chordLen(curveSeg),dist(P,C),1e-12);
  const enough=monotone&&straightUsable;
  return{enough,required,available,straightLength:straightLen,monotone,
    reason:enough?'enough room: curve handle can move to the midpoint inside the segment':(!monotone?'not enough room: required midpoint falls outside the curve segment':'not enough room: straight segment is degenerate')};
}

function makeSuperSmoothLineToCurve(lineSeg,curveSeg,opts={}){
  const lineTol=opts.lineTol!=null?opts.lineTol:1e-9,posTol=opts.posTol!=null?opts.posTol:1e-7;
  const order=opts.order||(isStraightSegment(lineSeg,lineTol)?'line-curve':'curve-line');
  // ORIENTATION: for 'line-curve' the line ENDS where the curve STARTS; for 'curve-line'
  // the curve ENDS where the line STARTS. Identify which side is straight from the actual
  // geometry rather than trusting the caller's argument order.
  const line = isStraightSegment(lineSeg,lineTol) ? lineSeg : curveSeg;
  const curve = isStraightSegment(lineSeg,lineTol) ? curveSeg : lineSeg;
  // If the caller states the order explicitly, honour it; otherwise infer from geometry.
  // (Inferring overrides the argument order, because the caller may pass the line first
  //  even when the line comes second in the contour.)
  const callerOrder=(opts.order==='line-curve'||opts.order==='curve-line')?opts.order:null;
  const orderResolved = callerOrder ? callerOrder : (line===lineSeg ? 'line-curve' : 'curve-line');
  if(!isStraightSegment(line,lineTol))return{status:'invalid-input',kind:orderResolved,reason:'given straight segment is not straight'};
  const scale=Math.max(chordLen(line),chordLen(curve),1e-12);
  // Shared endpoint, whichever orientation.
  const shareDist = orderResolved==='line-curve' ? dist(line[3],curve[0]) : dist(curve[3],line[0]);
  if(shareDist>posTol*scale)return{status:'invalid-input',kind:orderResolved,reason:'segments do not share an endpoint'};
  const room=lineToCurveRoom(line,curve,lineTol,orderResolved);
  // The midpoint rule that flattens the curve side to zero curvature AT the node
  // (B''=0 <=> P1=(P0+P2)/2) generally does NOT preserve tangent continuity: the
  // midpoint sits towards the curve's far handle, which is off the line. For a single
  // pair of cubic segments a line-to-curve join therefore cannot be both G1 and G2 --
  // they are mutually exclusive. Glyphs escapes this by moving the effective node and
  // creating points on export; we do not, so the honest answer is "no squircle here".
  const tangentKept=(node,newHandle)=>{
    const d=orderResolved==='line-curve'?sub(line[3],line[2]):sub(line[1],line[0]);
    const h=sub(newHandle,node);
    return Math.abs(cross(norm(d),norm(h)))<=1e-6;
  };
  if(orderResolved==='line-curve'){
    const P=curve[0],h2=curve[2];
    const newH={x:(P.x+h2.x)/2,y:(P.y+h2.y)/2,type:'cubic'};
    if(!tangentKept(P,newH))return{status:'infeasible',kind:'line-curve',order:orderResolved,node:{x:P.x,y:P.y},
      reason:'a line-to-curve G2 transition breaks tangent continuity for a single cubic pair (G1 and G2 are mutually exclusive here)',
      handleLeft:line[2],handleRight:curve[1],diagnostics:{room}};
    const curveNew=[P,newH,h2,curve[3]];
    const kL=curvatureAt(line,1),kR=curvatureAt(curveNew,0);
    return{status:room.enough?'ok':'ok-no-room',kind:'line-curve',order:orderResolved,node:{x:P.x,y:P.y},handleLeft:line[2],handleRight:newH,segments:{line,curve:curveNew},curvature:{left:kL.mag,right:kR.mag},room,diagnostics:{curvatureJump:Math.hypot(kL.vec.x-kR.vec.x,kL.vec.y-kR.vec.y)}};
  }
  const P=curve[3],h1=curve[1];
  const newH={x:(P.x+h1.x)/2,y:(P.y+h1.y)/2,type:'cubic'};
  if(!tangentKept(P,newH))return{status:'infeasible',kind:'curve-line',order:orderResolved,node:{x:P.x,y:P.y},
    reason:'a curve-to-line G2 transition breaks tangent continuity for a single cubic pair (G1 and G2 are mutually exclusive here)',
    handleLeft:curve[2],handleRight:line[1],diagnostics:{room}};
  const curveNew=[curve[0],h1,newH,P];
  const kL=curvatureAt(curveNew,1),kR=curvatureAt(line,0);
  return{status:room.enough?'ok':'ok-no-room',kind:'curve-line',order:orderResolved,node:{x:P.x,y:P.y},handleLeft:newH,handleRight:line[1],segments:{curve:curveNew,line},curvature:{left:kL.mag,right:kR.mag},room,diagnostics:{curvatureJump:Math.hypot(kL.vec.x-kR.vec.x,kL.vec.y-kR.vec.y)}};
}

function makeSuperSmooth(node,left,right,opts={}){
  const d=isSuperSmoothSupported(node,left,right,opts);
  if(d.kind==='line-line')return{status:'no-change',kind:d.kind,node,handleLeft:left[2],handleRight:right[1],reason:d.reason,diagnostics:{classification:d}};
  if(d.kind==='line-curve'||d.kind==='curve-line'){const order=d.kind,line=order==='line-curve'?left:right,curve=order==='line-curve'?right:left;const r=makeSuperSmoothLineToCurve(line,curve,{...opts,order});return{...r,diagnostics:{...r.diagnostics,classification:d}};}
  if(d.kind==='curve-curve'){const r=makeSuperSmoothCurveToCurve(node,left,right,opts);return{...r,diagnostics:{...r.diagnostics,classification:d}};}
  return{status:'invalid-input',kind:d.kind,reason:d.reason,diagnostics:{classification:d}};
}

// Opt-in Glyphs-style node drift. NOTE: Glyphs' exact objective is not public; this is a
// clearly-labelled surrogate (minimise total handle travel over a bounded angular sweep).
function effectiveNode(left,right,opts={}){
  const steps=opts.steps!=null?opts.steps:33,span=opts.span!=null?opts.span:Math.PI/12;
  // n is the FORWARD travel direction (left -> through P -> right); solveAtDirection places
  // the left handle at P - a*n, so passing a backward vector here would swap the sides.
  const P={x:left[3].x,y:left[3].y};
  const fwd=len(sub(right[1],P))>0?norm(sub(right[1],P)):norm(mul(sub(left[2],P),-1));
  const baseAng=Math.atan2(fwd.y,fwd.x);
  let best=null;
  for(let i=0;i<steps;i++){const ang=baseAng+(i/(steps-1)-0.5)*2*span,n={x:Math.cos(ang),y:Math.sin(ang)};const cand=solveAtDirection(left,right,P,n);if(!cand)continue;const cost=dist(cand.handleLeft,left[2])+dist(cand.handleRight,right[1]);if(!best||cost<best.cost)best={...cand,cost,angle:ang};}
  return best||{status:'infeasible',kind:'curve-curve',node:P,reason:'no feasible tangent direction in the swept window'};
}

// Slide the node ALONG its tangent until the two sides have equal curvature,
// keeping both handles exactly where they are. This is FontLab's Harmonize
// ("will move the Smooth nodes to a new position where the curve segments will
// join G2-smoothly, and will keep the handles where they were") and Glyphs'
// "effective node" -- and it is the only G2 mechanism that moves the NODE, so it
// is what makes a squircle upgrade visible as a node shift rather than as a
// silent handle reshuffle.
//
// Preconditions and why:
//   - The node must already be G1 (X, P, Y collinear). Sliding off that line
//     would break G1, so a corner has to be smoothed first. That is exactly the
//     path the product takes (makeSquircle establishes G1, then solves G2).
//   - The slide is 1-D (P -> P + s*n), which makes the solve exact and cheap: a
//     deterministic scan for a sign change plus bisection, no tolerance games.
//   - The window is bounded twice: by `slideFactor` x the shorter chord ("a
//     slight move", never a redesign) and by the point where a handle would
//     collapse onto the node.
// Returns null when there is nothing to do: not G1, degenerate handles, the join
// is already curvature-continuous at s=0, or no root inside the window.
function slideNodeForG2(node,left,right,opts={}){
  const P=finitePt(node)?{x:node.x,y:node.y}:null,X=left&&left[2],Y=right&&right[1];
  if(!P||!finitePt(X)||!finitePt(Y))return null;
  const aX=dist(X,P),aY=dist(Y,P);
  if(!(aX>1e-9)||!(aY>1e-9))return null;
  // G1 precondition: P lies on the segment XY, between the two handles.
  const dir=norm(sub(Y,P));
  if(len(dir)<1e-12)return null;
  const off=Math.abs(cross(dir,sub(X,P)));
  if(off>1e-6*Math.max(aX,aY,1e-12))return null;   // not G1 -> no slide
  const A=left[0],hA=left[1],hC=right[2],C=right[3];
  const minChord=Math.max(Math.min(chordLen(left),chordLen(right)),1e-12);
  const sMax=opts.slideMax!=null?opts.slideMax:(opts.slideFactor!=null?opts.slideFactor:0.1)*minChord;
  const lo0=Math.max(-sMax,-0.95*aX),hi0=Math.min(sMax,0.95*aY);
  if(!(hi0>lo0))return null;
  // Sliding the node ALONG the tangent cannot change the sense of the bend:
  // cross(n, farHandle - P) is invariant under P -> P + s*n, so an inflection
  // (the two sides curving opposite ways) can never be made G2 by sliding, no
  // matter how far the node moves. Refuse it up front -- otherwise the slide
  // would happily equalise the curvature MAGNITUDES and hand back a join whose
  // curvature vector still jumps, i.e. a squircle icon that lies.
  const kL0=curvatureAt([A,hA,X,P],1),kR0=curvatureAt([P,Y,hC,C],0);
  if(kL0.mag>1e-12&&kR0.mag>1e-12&&(kL0.vec.x*kR0.vec.x+kL0.vec.y*kR0.vec.y)<=0)return null;
  const f=(s)=>{
    const P2=add(P,mul(dir,s));
    return curvatureAt([A,hA,X,P2],1).mag-curvatureAt([P2,Y,hC,C],0).mag;
  };
  const f0=f(0);
  if(Math.abs(f0)<=1e-12*Math.max(Math.abs(f0),1e-12)+1e-18)return null;  // already G2 in place
  const steps=opts.slideSteps!=null?opts.slideSteps:65;
  let a=lo0,fa=f(a),b=0,fb=f0;
  if(fa===0)return{status:'ok',node:add(P,mul(dir,a)),handleLeft:X,handleRight:Y,tangent:dir,slide:a};
  if(fb===0)return null;
  let found=false;
  for(let i=1;i<=steps;i++){
    const s=lo0+(hi0-lo0)*(i/steps),fs=f(s);
    if(fs===0){a=s;fa=0;found=true;break;}
    if((fa<0)!==(fs<0)){b=s;fb=fs;found=true;break;}
    a=s;fa=fs;
  }
  if(!found)return null;                     // no sign change: no slide inside the window
  for(let i=0;i<60;i++){                     // bisect to machine precision
    const mid=(a+b)/2,fm=f(mid);
    if(fm===0){a=mid;break;}
    if((fa<0)!==(fm<0)){b=mid;}else{a=mid;fa=fm;}
  }
  const s=(a+b)/2,P2=add(P,mul(dir,s));
  const kL=curvatureAt([A,hA,X,P2],1),kR=curvatureAt([P2,Y,hC,C],0);
  // belt and braces: the accepted root must really be a curvature CONTINUITY,
  // not just equal magnitudes (see the inflection note above)
  if(kL.mag>1e-12&&kR.mag>1e-12&&(kL.vec.x*kR.vec.x+kL.vec.y*kR.vec.y)<=0)return null;
  return{status:'ok',kind:'curve-curve',node:P2,handleLeft:X,handleRight:Y,tangent:dir,slide:s,
    handleBudget:{in:aX,out:aY},
    curvature:{left:kL.mag,right:kR.mag,signedLeft:kL.k,signedRight:kR.k},
    segments:{left:[A,hA,X,P2],right:[P2,Y,hC,C]},
    diagnostics:{slide:s,curvatureJump:Math.hypot(kL.vec.x-kR.vec.x,kL.vec.y-kR.vec.y)}};
}

// Choose between the two G2 mechanisms, Glyphs/FontLab style:
//   H = re-solve the handle LENGTHS, node stays where the user put it
//       (the in-place closed form, which is what we have always done);
//   S = slide the node along its tangent, handles stay where the user drew them.
// Both are exact. Pick the cheaper one, where "cheaper" means total handle
// travel for H and |slide| for S, scaled by `driftWeight` (default 1: a unit of
// node movement costs the same as a unit of handle movement). Ties keep H, so a
// join that is already fine in place never has its node nudged.
//
// Returns the H result unchanged when there is no slide to consider (not G1,
// already G2, no root in the window, line-curve / line-line joins, or an
// infeasible join -- an inflection is not something a "slight move" may fix).
function makeSuperSmoothWithNodeDrift(node,left,right,opts={}){
  const base=makeSuperSmooth(node,left,right,opts);
  if(base.status!=='ok'||base.kind!=='curve-curve')return base;
  const driftWeight=opts.driftWeight!=null?opts.driftWeight:1;
  const baseCost=dist(base.handleLeft,left[2])+dist(base.handleRight,right[1]);
  const slide=slideNodeForG2(base.node,left,right,opts);
  if(!slide)return{...base,diagnostics:{...base.diagnostics,drift:{tried:true,moved:false,costInPlace:baseCost}}};
  const slideCost=driftWeight*Math.abs(slide.slide);
  if(!(slideCost<baseCost-1e-12))return{...base,diagnostics:{...base.diagnostics,drift:{tried:true,moved:false,slideCost,costInPlace:baseCost}}};
  return{...slide,nodeDrift:{from:{x:base.node.x,y:base.node.y},to:slide.node,distance:Math.abs(slide.slide)},
    diagnostics:{...slide.diagnostics,curvatureJumpInPlace:base.diagnostics.curvatureJump,
      costInPlace:baseCost,costDrifted:slideCost,mechanism:'node-slide'}};
}

function curvatureReport(left,right){const kl=curvatureAt(left,1),kr=curvatureAt(right,0);return{left:kl,right:kr,magnitudeJump:Math.abs(kl.mag-kr.mag),vectorJump:Math.hypot(kl.vec.x-kr.vec.x,kl.vec.y-kr.vec.y)};}

export{add,sub,mul,dot,cross,len,len2,norm,rot90,dist,closeTo,bezDeriv1,bezDeriv2,curvatureAt,unitTangentAt,chordLen,isStraightSegment,hasStraightEndpoint,bendSenseProduct,isSuperSmoothSupported,makeSuperSmoothCurveToCurve,makeSuperSmoothLineToCurve,lineToCurveRoom,slideNodeForG2,makeSuperSmooth,effectiveNode,makeSuperSmoothWithNodeDrift,curvatureReport};
