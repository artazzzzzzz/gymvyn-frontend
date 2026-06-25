import { useParams } from 'react-router-dom';
import TrainerDietBuilder from '../TrainerDietBuilder';

export default function DirectDietPlanPage() {
  const { clientId } = useParams();
  return <TrainerDietBuilder directClientId={clientId} />;
}
