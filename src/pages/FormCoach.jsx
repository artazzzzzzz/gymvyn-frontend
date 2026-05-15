import { useNavigate } from 'react-router-dom'
import FormCoachModal from '../components/FormCoachModal'

export default function FormCoach() {
  const navigate = useNavigate()

  return (
    <FormCoachModal
      isOpen
      exerciseName=""
      onClose={() => navigate(-1)}
      onFormScore={(score) => console.log('[FormCoach] avg form score:', score)}
    />
  )
}
