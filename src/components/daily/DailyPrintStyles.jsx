const DailyPrintStyles = () => (
  <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { background: white !important; font-size: 11px; line-height: 1.35; }
          .print-hide { display: none !important; }
          .print-only { display: block !important; }
          .print-wrap { padding: 0 !important; max-width: 100% !important; }
          .print-content { zoom: 0.85; }
          .print-table { border-collapse: collapse; width: 100%; }
          .print-table th, .print-table td { border: 1px solid #d1d5db; padding: 4px 6px; text-align: left; }
          .print-table th { background: #f3f4f6; font-weight: 700; }
          h1,h2,h3,h4,h5 { margin: 0 0 6px 0; }
          .print-block { page-break-inside: avoid; margin-bottom: 8px; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>
)

export default DailyPrintStyles
