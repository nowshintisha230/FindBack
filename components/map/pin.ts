import L from "leaflet";

export const dotIcon = (color: string) =>
  L.divIcon({
    className: "",
    html: `<div style="width:20px;height:20px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.55);transform:translate(-50%,-50%)"></div>`,
    iconSize: [0, 0],
  });