"use client";

const PH_URL = "https://www.producthunt.com/products/chess-bet?embed=true&utm_source=embed&utm_medium=post_embed";
const PH_IMG = "https://ph-files.imgix.net/63735503-a34f-4c31-a3e5-9d3c42ae7881.png?auto=compress,format&codec=mozjpeg&cs=strip&fit=crop&h=80&w=80";

/** Карточка Chess Bet на Product Hunt (ссылка на страницу продукта) */
export default function ProductHuntCard() {
  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", border: "1px solid rgb(224,224,224)", borderRadius: 12, padding: 20, maxWidth: 500, width: "100%", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,.05)", marginInline: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="Chess Bet" src={PH_IMG} width={64} height={64} loading="lazy" style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "rgb(26,26,26)", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Chess Bet</h3>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "rgb(102,102,102)", lineHeight: 1.4 }}>Skill-based Web3 chess, social networking, and classifieds.</p>
        </div>
      </div>
      <a href={PH_URL} target="_blank" rel="noopener" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 12, padding: "8px 16px", background: "rgb(255,97,84)", color: "#fff", textDecoration: "none", borderRadius: 9999, fontSize: 16, fontWeight: 600, lineHeight: 1.5 }}>
        Check it out on Product Hunt →
      </a>
    </div>
  );
}
