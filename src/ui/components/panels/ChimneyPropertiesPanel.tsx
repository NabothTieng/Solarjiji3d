import { useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  chimneysAtom,
  selectedChimneyAtom,
  selectedChimneyIdAtom,
  rectanglesAtom,
  type Chimney3D,
  type ChimneyShape,
  getRectWidth,
} from "../../../three/store/rectangleStore";
import { metersPerUnitAtom } from "../../../store/atoms";
import { Box, Button, Input, Span } from "@chakra-ui/react";
import ShapeButton from "../buttons/ShapeButton";

const PRESET_COLORS = [
  "#8B4513",
  "#D2691E",
  "#808080",
  "#C0C0C0",
  "#800000",
];

export function ChimneyPropertiesPanel() {
  const selectedChimney = useAtomValue(selectedChimneyAtom);
  const [, setChimneys] = useAtom(chimneysAtom);
  const [, setSelectedChimneyId] = useAtom(selectedChimneyIdAtom);
  const rectangles = useAtomValue(rectanglesAtom);
  const metersPerUnit = useAtomValue(metersPerUnitAtom);

  const parentRoof = useMemo(() => {
    if (!selectedChimney) return null;
    return rectangles.find((r) => r.id === selectedChimney.rectangleId);
  }, [selectedChimney, rectangles]);

  const updateChimney = (updates: Partial<Chimney3D>) => {
    if (!selectedChimney) return;
    setChimneys((prev) =>
      prev.map((c) => (c.id === selectedChimney.id ? { ...c, ...updates } : c)),
    );
  };

  const deleteChimney = () => {
    if (!selectedChimney) return;
    setChimneys((prev) => prev.filter((c) => c.id !== selectedChimney.id));
    setSelectedChimneyId(null);
  };

  const handleShapeChange = (shape: ChimneyShape) => {
    updateChimney({
      shape,
      width: shape === "circular" ? 0.3 : 0.4,
      depth: shape === "circular" ? 0.3 : 0.3,
    });
  };

  return (
    selectedChimney && (
      <Box
        position={"absolute"}
  top={0}
  left={72}
  height={"full"}
        background={"#1e1e2e"}
        color={"#cdd6f4"}
        borderLeft={"1px solid #313244"}
        display={"flex"}
        flexDirection={"column"}
        fontFamily={
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }
        fontSize={13}
        zIndex={210}
        overflow={"hidden"}
        width={280}
      >
        {}
        <Box
          padding={"16px 20px"}
          borderBottom={"1px solid #313244"}
          fontSize={15}
          fontWeight={600}
          letterSpacing={0.3}
          cursor={"pointer"}
          display={"flex"}
          alignItems={"center"}
          justifyContent={"space-between"}
          userSelect={"none"}
          onClick={() => setSelectedChimneyId(null)}
        >
          <Span display={"inline"}>🏠 Chimney Properties</Span>
          <Span
            style={{
              transform: "rotate(0deg)",
              transition: "transform 0.2s ease",
              fontSize: 12,
            }}
          >
            {"◀"}
          </Span>
        </Box>

        {/* Body */}
        <Box
          flex={1}
          overflowY={"auto"}
          padding={"16px 20px"}
          display={"flex"}
          flexDirection={"column"}
          gap={20}
        >
          {/* ------- Parent Roof Info ------- */}
          {parentRoof && (
            <Box
              style={{
                background: "#313244",
                borderRadius: 8,
                padding: "10px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                fontSize: 12,
              }}
            >
              <Box
                fontSize={11}
                fontWeight={600}
                textTransform="uppercase"
                letterSpacing={1}
                color="#fab387"
                marginBottom={4}
              >
                📐 Parent Roof
              </Box>
              <Box style={{ display: "flex", justifyContent: "space-between" }}>
                <Span style={{ color: "#a6adc8" }}>Roof Type</Span>
                <Span style={{ textTransform: "capitalize" }}>
                  {parentRoof.roofType}
                </Span>
              </Box>
              <Box style={{ display: "flex", justifyContent: "space-between" }}>
                <Span style={{ color: "#a6adc8" }}>Roof Length</Span>
                <Span>
                  {(getRectWidth(parentRoof) * metersPerUnit).toFixed(2)} m
                </Span>
              </Box>
            </Box>
          )}

          {/* ------- Shape ------- */}
          <Box>
            <Box
              fontSize={11}
              fontWeight={600}
              textTransform="uppercase"
              letterSpacing={1}
              color="#fab387"
              marginBottom={4}
            >
              Shape
            </Box>
            <Box style={{ display: "flex", gap: 6,}}>
              <ShapeButton
                shape="rectangular"
                isActive={selectedChimney.shape === "rectangular"}
                onClick={() => handleShapeChange("rectangular")}
              />
              <ShapeButton
                shape="circular"
                isActive={selectedChimney.shape === "circular"}
                onClick={() => handleShapeChange("circular")}
              />
            </Box>
          </Box>

          {}
          <Box>
            <Box
              fontSize={11}
              fontWeight={600}
              textTransform="uppercase"
              letterSpacing={1}
              color="#fab387"
              marginBottom={4}
            >
              Position (Relative to Roof Center)
            </Box>

            {/* Local X (along centerline) */}
            <Box style={{display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", marginBottom: 6, mt: 14}}>
              <Span>Along Roof</Span>
              <Span style={{ color: "#a6adc8", fontSize: 12 }}>
                {selectedChimney.localX.toFixed(2)}{" "}
                <Span style={{ color: "#fab387" }}>
                  ({(selectedChimney.localX * metersPerUnit).toFixed(2)} m)
                </Span>
              </Span>
            </Box>
            <Box display={"flex"} alignItems={"center"} gap={10}>
              <Input
              className="generator-input"
                type="range"
                min={-3}
                max={3}
                step={0.1}
                value={selectedChimney.localX}
                onChange={(e) =>
                  updateChimney({ localX: parseFloat(e.target.value) })
                }
                style={{ flex: 1, accentColor: "#fab387" }}
              />
              <Input
                type="number"
                step={0.1}
                value={selectedChimney.localX}
                onChange={(e) =>
                  updateChimney({ localX: parseFloat(e.target.value) || 0 })
                }
                width={64}
                textAlign={"right"}
                padding={"6px 10px"}
                background={"#313244"}
                border={"1px solid #45475a"}
                borderRadius={6}
                color={"#cdd6f4"}
                fontSize={13}
                outline={"none"}
              />
            </Box>

            {/* Local Z (perpendicular to centerline) */}
            <Box
              display={"flex"}
              alignItems={"center"}
              justifyContent={"space-between"}
              gap={8}
              mt={6}
            >
              <Span>Across Roof</Span>
              <Span style={{ color: "#a6adc8", fontSize: 12 }}>
                {selectedChimney.localZ.toFixed(2)}{" "}
                <Span style={{ color: "#fab387" }}>
                  ({(selectedChimney.localZ * metersPerUnit).toFixed(2)} m)
                </Span>
              </Span>
            </Box>
            <Box display={"flex"} alignItems={"center"} gap={10}>
              <Input
              className="generator-input"
                type="range"
                min={-2}
                max={2}
                step={0.1}
                value={selectedChimney.localZ}
                onChange={(e) =>
                  updateChimney({ localZ: parseFloat(e.target.value) })
                }
                style={{ flex: 1, accentColor: "#fab387" }}
              />
              <Input
                type="number"
                step={0.1}
                value={selectedChimney.localZ}
                onChange={(e) =>
                  updateChimney({ localZ: parseFloat(e.target.value) || 0 })
                }
                width={64}
                padding={"6px 10px"}
                background={"#313244"}
                border={"1px solid #45475a"}
                borderRadius={6}
                color={"#cdd6f4"}
                fontSize={13}
                outline={"none"}
                textAlign={"right"}
              />
            </Box>
          </Box>

          {}
          <Box>
            <Box
              fontSize={11}
              fontWeight={600}
              textTransform="uppercase"
              letterSpacing={1}
              color="#fab387"
              marginBottom={4}
            >
              Dimensions
            </Box>

            {/* Width/Diameter */}
            <Box
              display={"flex"}
              alignItems={"center"}
              justifyContent={"space-between"}
              gap={8}
              marginTop={6}
              marginBottom={2}
            >
              <Span>
                {selectedChimney.shape === "circular" ? "Diameter" : "Width"}
              </Span>
              <Span style={{ color: "#a6adc8", fontSize: 12 }}>
                {selectedChimney.width.toFixed(2)}{" "}
                <Span style={{ color: "#fab387" }}>
                  ({(selectedChimney.width * metersPerUnit).toFixed(2)} m)
                </Span>
              </Span>
            </Box>
            <Box display={"flex"} alignItems={"center"} gap={10}>
              <Input
              className="generator-input"
                type="range"
                min={0.1}
                max={1.5}
                step={0.05}
                value={selectedChimney.width}
                onChange={(e) =>
                  updateChimney({ width: parseFloat(e.target.value) })
                }
                style={{ flex: 1, accentColor: "#fab387" }}
              />
              <Input
                type="number"
                min={0.1}
                max={3}
                step={0.05}
                value={selectedChimney.width}
                onChange={(e) =>
                  updateChimney({
                    width: Math.max(0.1, parseFloat(e.target.value) || 0.1),
                  })
                }
                width={64}
                padding={"6px 10px"}
                background={"#313244"}
                border={"1px solid #45475a"}
                borderRadius={6}
                color={"#cdd6f4"}
                fontSize={13}
                outline={"none"}
                textAlign={"right"}
              />
            </Box>

            {/* Depth (only for rectangular) */}
            {selectedChimney.shape === "rectangular" && (
              <>
                <Box
                  display={"flex"}
                  alignItems={"center"}
                  justifyContent={"space-between"}
                  gap={8}
                  marginTop={6}
              marginBottom={2}
                >
                  <Span>Depth</Span>
                  <Span style={{ color: "#a6adc8", fontSize: 12 }}>
                    {selectedChimney.depth.toFixed(2)}{" "}
                    <Span style={{ color: "#fab387" }}>
                      ({(selectedChimney.depth * metersPerUnit).toFixed(2)} m)
                    </Span>
                  </Span>
                </Box>
                <Box display={"flex"} alignItems={"center"} gap={10}>
                  <Input
                  className="generator-input"
                    type="range"
                    min={0.1}
                    max={1.5}
                    step={0.05}
                    value={selectedChimney.depth}
                    onChange={(e) =>
                      updateChimney({ depth: parseFloat(e.target.value) })
                    }
                    style={{ flex: 1, accentColor: "#fab387" }}
                  />
                  <Input
                    type="number"
                    min={0.1}
                    max={3}
                    step={0.05}
                    value={selectedChimney.depth}
                    onChange={(e) =>
                      updateChimney({
                        depth: Math.max(0.1, parseFloat(e.target.value) || 0.1),
                      })
                    }
                    width={64}
                    padding={"6px 10px"}
                    background={"#313244"}
                    border={"1px solid #45475a"}
                    borderRadius={6}
                    color={"#cdd6f4"}
                    fontSize={13}
                    outline={"none"}
                    textAlign={"right"}
                  />
                </Box>
              </>
            )}

            {}
            <Box
              display={"flex"}
              alignItems={"center"}
              justifyContent={"space-between"}
              gap={8}
              marginTop={6}
              marginBottom={2}
            >
              <Span>Height</Span>
              <Span style={{ color: "#a6adc8", fontSize: 12 }}>
                {selectedChimney.height.toFixed(2)}{" "}
                <Span style={{ color: "#fab387" }}>
                  ({(selectedChimney.height * metersPerUnit).toFixed(2)} m)
                </Span>
              </Span>
            </Box>
            <Box display={"flex"} alignItems={"center"} gap={10}>
              <Input
              className="generator-input"
                type="range"
                min={0.2}
                max={2}
                step={0.05}
                value={selectedChimney.height}
                onChange={(e) =>
                  updateChimney({ height: parseFloat(e.target.value) })
                }
                style={{ flex: 1, accentColor: "#fab387" }}
              />
              <Input
                type="number"
                min={0.2}
                max={5}
                step={0.05}
                value={selectedChimney.height}
                onChange={(e) =>
                  updateChimney({
                    height: Math.max(0.2, parseFloat(e.target.value) || 0.2),
                  })
                }
                width={64}
                padding={"6px 10px"}
                background={"#313244"}
                border={"1px solid #45475a"}
                borderRadius={6}
                color={"#cdd6f4"}
                fontSize={13}
                outline={"none"}
                textAlign={"right"}
              />
            </Box>
          </Box>

          <Box>
            <Box
              fontSize={11}
              fontWeight={600}
              textTransform="uppercase"
              letterSpacing={1}
              color="#fab387"
              marginBottom={4}
            >
              Color
            </Box>
            <Box
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: 6,
                marginBottom: 10,
              }}
            >
              {PRESET_COLORS.map((c) => (
                <Button
                  key={c}
                  onClick={() => updateChimney({ color: c })}
                  width={"100%"}
                  aspectRatio={"1"}
                  background={c}
                  border={
                    selectedChimney.color === c
                      ? "2px solid #fab387"
                      : "1px solid #45475a"
                  }
                  borderRadius={6}
                  cursor={"pointer"}
                />
              ))}
            </Box>
            <Input
              type="color"
              value={selectedChimney.color}
              onChange={(e) => updateChimney({ color: e.target.value })}
              width={"100%"}
              height={32}
              border={"none"}
              borderRadius={6}
              cursor={"pointer"}
              background={"transparent"}
            />
          </Box>

          <Box marginTop={"auto"} paddingTop={12}>
            <Button
              onClick={deleteChimney}
              width={"full"}
              padding={"10px"}
              bg={"#45475a"}
              border={"1px solid #f38ba8"}
              borderRadius={8}
              color={"#f38ba8"}
              fontWeight={600}
              cursor={"pointer"}
              fontSize={13}
            >
              Delete Chimney
            </Button>
          </Box>
        </Box>
      </Box>
    )
  );
}
