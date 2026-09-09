import ReversionReport from './ReversionReport';
import { excelService } from '../services/excelService';

interface ReversionNewProps {
  onRefresh: () => void;
}

export default function ReversionNew({ onRefresh }: ReversionNewProps) {
  return (
    <ReversionReport
      onRefresh={onRefresh}
      title="Reversion New"
      subtitle="Source: ReversionMasterQueryNew.xlsx"
      dataLoader={async () => excelService.loadReversionNewData()}
    />
  );
}
