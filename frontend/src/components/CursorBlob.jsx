import { useEffect, useRef } from "react";

const CursorBlob = () => {
  const blobRef = useRef(null);

  useEffect(() => {
    const moveBlob = (e) => {
      const { clientX, clientY } = e;
      if (blobRef.current) {
        blobRef.current.animate(
          {
            left: `${clientX}px`,
            top: `${clientY}px`,
          },
          { duration: 300, fill: "forwards" }
        );
      }
    };

    window.addEventListener("pointermove", moveBlob);
    return () => window.removeEventListener("pointermove", moveBlob);
  }, []);

  return (
    <div
      ref={blobRef}
      className="fixed z-40 h-32 w-32 rounded-full pointer-events-none blur-2xl mix-blend-lighten opacity-30"
      style={{
        left: "0px",
        top: "0px",
        position: "absolute",
        transform: "translate(-50%, -50%)",
        background: "linear-gradient(135deg, #8e2de2, #ff6fd8)",
      }}
    />
  );
};

export default CursorBlob;
