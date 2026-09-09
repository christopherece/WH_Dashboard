import ReversionReport from './ReversionReport';
import { excelService } from '../services/excelService';

interface Sep30ReportProps {
  onRefresh: () => void;
}

export default function Sep30Report({ onRefresh }: Sep30ReportProps) {
  return (
    <ReversionReport
      onRefresh={onRefresh}
      title="30 Sep 2026 Snapshot Report"
      subtitle="Source: Sep30Report.xlsx"
      dataLoader={async () => excelService.loadSep30ReportData()}
    />
  );
}
