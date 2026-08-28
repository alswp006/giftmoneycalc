import { useLocation, useNavigate } from 'react-router-dom';
import type { RouteState } from '@/lib/types';

export default function Calc() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as RouteState['/calc'];
  console.log('DEBUG STRIPPED location full', JSON.stringify(location), JSON.stringify(state));
  void navigate;
  return <div>stripped</div>;
}
