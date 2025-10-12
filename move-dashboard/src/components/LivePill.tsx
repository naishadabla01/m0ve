// components/LivePill.tsx (or inline in the page)
export function LivePill() {
  return (
    <span className="live-pill">
      <span className="dot" />
      Live
      <style jsx>{`
        .live-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 2px 10px;
          border-radius: 999px;
          font-size: 12px;
          line-height: 18px;
          font-weight: 600;
          color: #34d399; /* emerald-400 */
          background: rgba(16,185,129,.12); /* emerald-500 @ 12% */
          border: 1px solid rgba(16,185,129,.35);
        }
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 0 0 rgba(52,211,153,.7);
          animation: ping 1.4s infinite;
        }
        @keyframes ping {
          0% { box-shadow: 0 0 0 0 rgba(52,211,153,.7); }
          70% { box-shadow: 0 0 0 8px rgba(52,211,153,0); }
          100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); }
        }
      `}</style>
    </span>
  );
}
