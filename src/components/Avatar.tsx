import React from "react";
import { Img, staticFile } from "remotion";

type Props = { size: number; logoSrc?: string; border?: number };

// Channel avatar: the logo from public/ if provided, otherwise a panda placeholder.
export const Avatar: React.FC<Props> = ({ size, logoSrc, border = 0 }) => {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    border: border ? `${border}px solid #fff` : undefined,
    boxSizing: "border-box",
    flexShrink: 0,
  };
  if (logoSrc) {
    return <Img src={staticFile(logoSrc)} style={{ ...style, objectFit: "cover" }} />;
  }
  return (
    <div
      style={{
        ...style,
        background: "radial-gradient(circle at 35% 30%, #ffffff, #d9dde3 70%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.62,
        lineHeight: 1,
      }}
    >
      🐼
    </div>
  );
};
