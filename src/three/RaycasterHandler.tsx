const RaycasterHandler = () => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1000, 1000]} />
      <meshBasicMaterial color="transparent" transparent opacity={0.2} />
    </mesh>
  );
};

export default RaycasterHandler;
