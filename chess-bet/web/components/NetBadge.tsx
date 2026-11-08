/** Круглый цветной значок соцсети для кнопок «Поделиться» */
export default function NetBadge({ glyph, color, size = 36 }: { glyph: string; color: string; size?: number }) {
  return (
    <span aria-hidden="true" className="grid shrink-0 place-items-center rounded-full font-extrabold leading-none text-white shadow-sm"
      style={{ width: size, height: size, background: color, fontSize: Math.round(size * (glyph.length > 1 ? 0.36 : 0.46)) }}>
      {glyph}
    </span>
  );
}
