import GaugeWidget from "../widgets/GaugeWidget";
import LineWidget from "../widgets/LineWidget";
import BigNumberWidget from "../widgets/BigNumberWidget";

import ImageWidget from "../widgets/ImageWidget";
import ImageWidgetConfigurator from "../widgets/ImageWidgetConfigurator";

export default function WidgetRenderer({
  type,
  value,
  dataKey,
  data,
  history,
  item,
  updateItem,
  editMode = false,
}) {

  switch (type) {

  
    // GAUGE
  
    case "gauge":

      return (
        <GaugeWidget
          value={value}
          label={dataKey}
          dataKey={dataKey}
        />
      );

  
    // BIG NUMBER
  
    case "bignumber":

      return (
        <BigNumberWidget
          value={value}
          label={dataKey}
        />
      );

  
    // LINE
  
    case "line":

      return (
        <LineWidget
          data={history}
          label={dataKey}

          lines={[
            {
              key: dataKey,
              color: "#3b82f6",
            },
          ]}
        />
      );

  
    // IMAGE
  
    case "image":

      // BUILDER MODE
      if (editMode) {

        return (

          <ImageWidgetConfigurator

            pins={item.pins || []}

            setPins={(updatedPins) => {

              updateItem({
                ...item,
                pins: updatedPins,
              });

            }}

          />

        );
      }

      // DASHBOARD MODE
      return (

        <ImageWidget
          pins={item.pins || []}
          valueMap={data}
        />

      );

    default:

      return (
        <div className="
          text-gray-400
        ">
          Unknown Widget
        </div>
      );
  }
}