import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { type Poll } from "@/lib/schema";

export default function PollResults() {
  const { data: polls = [], isLoading } = useQuery<Poll[]>({
    queryKey: ["/api/polls"],
  });

  // Get the most recent completed poll or the first poll with results
  const featuredPoll = polls.find(poll => poll.status === "completed" && (poll.totalVotes || 0) > 0) || polls[0];

  const getVotePercentage = (votes: number, totalVotes: number) => {
    return totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
  };

  const getOptionColor = (index: number) => {
    const colors = [
      { bg: "bg-blue-500", text: "text-blue-500" },
      { bg: "bg-green-500", text: "text-green-500" },
      { bg: "bg-purple-500", text: "text-purple-500" },
      { bg: "bg-orange-500", text: "text-orange-500" },
      { bg: "bg-pink-500", text: "text-pink-500" },
    ];
    return colors[index % colors.length];
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

  if (!featuredPoll) {
    return (
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Poll Results</h3>
        </div>
        <div className="p-6 text-center">
          <p className="text-slate-500 text-sm">No poll results to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">Poll Results</h3>
      </div>
      
      <div className="p-6">
        <div className="mb-6">
          <h4 className="text-md font-medium text-slate-900 mb-4">
            {featuredPoll.question}
          </h4>
          <div className="space-y-3">
            {featuredPoll.options.map((option, index) => {
              const percentage = getVotePercentage(option.votes, featuredPoll.totalVotes || 0);
              const colors = getOptionColor(index);
              
              return (
                <div key={option.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 ${colors.bg} rounded`}></div>
                    <span className="text-sm text-slate-700">{option.text}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-slate-200 rounded-full h-2">
                      <div 
                        className={`${colors.bg} h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 min-w-[3rem] text-right">
                      {percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Total Responses:</span>
              <span className="font-medium text-slate-900">{featuredPoll.totalVotes || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-slate-600">Poll Status:</span>
              <Badge className={featuredPoll.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}>
                {featuredPoll.status === "completed" ? "Completed" : "Active"}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="border-t border-slate-200 pt-4">
          <h5 className="text-sm font-medium text-slate-900 mb-3">Recent Activity</h5>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>New vote from anonymous user</span>
              <span>2 min ago</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Poll shared via link</span>
              <span>5 min ago</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Milestone: {Math.floor((featuredPoll.totalVotes || 0) / 50) * 50} votes reached</span>
              <span>1 hour ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
