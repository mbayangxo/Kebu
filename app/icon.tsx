import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Tab favicon — orange Africa emblem. */
export default function Icon() {
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
          borderRadius: 7,
        }}
      >
        <div
          style={{
            width: 16,
            height: 18,
            background: "#FFF8F2",
            borderRadius: "40% 45% 42% 48%",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
