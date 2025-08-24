import { useQuery } from "@tanstack/react-query";
import { Folder, Play, CheckCircle, Pause } from "lucide-react";
import { type Project } from "@/lib/schema";

export default function ProjectStats() {
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === "active").length,
    completed: projects.filter(p => p.status === "completed").length,
    onHold: projects.filter(p => p.status === "on_hold").length,
  };

  const statCards = [
    {
      label: "Total Projects",
      value: stats.total,
      icon: Folder,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Active Projects", 
      value: stats.active,
      icon: Play,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle,
      bgColor: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      label: "On Hold",
      value: stats.onHold,
      icon: Pause,
      bgColor: "bg-amber-100",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map(({ label, value, icon: Icon, bgColor, iconColor }) => (
        <div key={label} className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600">{label}</p>
              <p className="text-2xl font-semibold text-slate-900">{value}</p>
            </div>
            <div className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
