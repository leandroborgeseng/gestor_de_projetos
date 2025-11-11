import { useParams } from "react-router-dom";
import CalendarView from "../components/CalendarView.js";

export default function Calendar() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <div className="text-center py-12 text-gray-400">Projeto não encontrado</div>;
  }

  return <CalendarView projectId={id} />;
}

