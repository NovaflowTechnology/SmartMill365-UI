import TemplateDesigner from "./TemplateDesigner";

export default function TemplateBuilder(props) {
  return <TemplateDesigner {...props} mode="create" />;
}