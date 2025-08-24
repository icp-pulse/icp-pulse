import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { type Survey } from "@/lib/schema";

export default function SurveyList() {
  const { data: surveys = [], isLoading } = useQuery<Survey[]>({
    queryKey: ["/api/surveys"],
  });

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      active: "bg-green-100 text-green-800",
      draft: "bg-blue-100 text-blue-800",
      closed: "bg-gray-100 text-gray-800",
    };
    
    return (
      <Badge className={`${statusStyles[status as keyof typeof statusStyles] || "bg-gray-100 text-gray-800"}`}>
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 rounded"></div>
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">Recent Surveys</h3>
      </div>
      
      <div className="p-4 space-y-3">
        {surveys.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">No surveys created yet</p>
          </div>
        ) : (
          surveys.slice(0, 10).map((survey) => (
            <div key={survey.id} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-slate-900">{survey.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">{survey.responses} responses</p>
                </div>
                {getStatusBadge(survey.status)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
