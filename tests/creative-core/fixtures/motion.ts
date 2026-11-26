import { artDirectionFixture } from "./art-direction";
import { defaultNativeMotion } from "../../../lib/creative-core";
export function motionFixture() {
 const f=artDirectionFixture();
 f.doc.nodes[f.text].props.rotation=20;f.doc.nodes[f.text].props.scaleX=1.2;f.doc.nodes[f.text].props.elementWidth=300;f.doc.nodes[f.text].props.elementHeight=120;
 f.doc.nodes[f.text].motion={...defaultNativeMotion,preset:"rise",duration:1200};
 f.doc.nodes[f.text].interaction={version:1,effect:"grow",duration:150,easing:"ease-out"};
 return f;
}
