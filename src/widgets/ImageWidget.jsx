import {
  TECH_SURFACE_CLASS,
  TechBackdrop,
} from "./widgetTech";
import ImageOverlayCanvas from "./ImageOverlayCanvas";

export default function ImageWidget({
  valueMap = {},
  history = [],
  pins = [],
  image = null,
  customDataOptions = [],
}) {
  return (
    <div className={`${TECH_SURFACE_CLASS} p-0`}>
      <TechBackdrop />

      <ImageOverlayCanvas
        image={image}
        pins={pins}
        valueMap={valueMap}
        history={history}
        customDataOptions={customDataOptions}
        renderUnmapped={false}
        editorMode={false}
      />
    </div>
  );
}
