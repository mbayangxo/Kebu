import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch icon — orange Africa emblem. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FF5500",
          borderRadius: 40,
        }}
      >
        <div
          style={{
            width: 88,
            height: 100,
            background: "#FFF8F2",
            borderRadius: "40% 45% 42% 48%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 28,
            width: 56,
            height: 8,
            background: "#E10600",
            borderRadius: 4,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
