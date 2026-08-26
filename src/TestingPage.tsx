import { useEffect, useRef } from "react";

/**
 * /testing — embeds the Amber property-listing widget via its external script.
 * The script is loaded once on mount and torn down if the component unmounts.
 */
export default function TestingPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Avoid double-loading if React strict-mode re-mounts.
    if (document.getElementById("_aw")) return;

    const script = document.createElement("script");
    script.id = "_aw";
    script.src = "https://d341zbz41jo7w1.cloudfront.net/widget/list/3.1.0.js";
    script.async = true;
    script.onload = () => {
      if (containerRef.current && (window as any)._aw) {
        (window as any)._aw("init", {
          element: containerRef.current,
          location: "london",
          partnerId: "test",
          fontFamily: "",
          sort: "Recommended",
          numListings: 6,
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      const el = document.getElementById("_aw");
      if (el) el.remove();
    };
  }, []);

  return (
    <div style={{ padding: "40px 20px" }}>
      <h1 className="vd-h2" style={{ marginBottom: 24 }}>
        Widget Testing
      </h1>
      {/* The widget renders inside this div */}
      <div id="amber-widget" ref={containerRef} />
      <div className="amber-link" style={{ textAlign: "center" }} />
    </div>
  );
}
