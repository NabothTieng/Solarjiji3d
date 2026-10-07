import type { ChimneyShape } from "../../../types";
import { Button, Span } from "@chakra-ui/react";

function ShapeButton({
  shape,
  isActive,
  onClick,
}: {
  shape: ChimneyShape;
  isActive: boolean;
  onClick: () => void;
}) {
  const icons: Record<ChimneyShape, string> = {
    rectangular: "▢",
    circular: "○",
  };

  const names: Record<ChimneyShape, string> = {
    rectangular: "Rectangular",
    circular: "Circular",
  };

  return (
    <Button
      onClick={onClick}
      display={"flex"}
      flexDirection={"column"}
      alignItems={"center"}
      gap={4}
      padding={"40px 6px"}
      flex={1}
      background={isActive ? "#45475a" : "#313244"}
      border={isActive ? "2px solid #fab387" : "1px solid #45475a"}
      borderRadius={8}
      color={isActive ? "#fab387" : "#cdd6f4"}
      cursor={"pointer"}
      transition={"all 0.15s ease"}
      fontSize={12}
    >
      <Span fontSize={22}>{icons[shape]}</Span>
      <Span fontWeight={isActive ? 600 : 400}>{names[shape]}</Span>
    </Button>
  );
}

export default ShapeButton;
