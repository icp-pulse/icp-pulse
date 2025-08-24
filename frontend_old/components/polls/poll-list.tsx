import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Poll } from "@/lib/schema";

export default function PollList() {
  const { data: polls = [], isLoading } = useQuery<Poll[]>({
    queryKey: ["/api/polls"],
  });

  const activePolls = polls.filter(poll => poll.status === "active");

  const getTimeLeft = (createdAt: Date, duration: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const durationHours = {
      "1_day": 24,
      "3_days": 72, 
      "1_week": 168,
      "1_month": 720,
    };
    
    const endTime = new Date(created.getTime() + (durationHours[duration as keyof typeof durationHours] * 60 * 60 * 1000));
    const timeLeft = endTime.getTime() - now.getTime();
    
    if (timeLeft <= 0) return "Ended";
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`;
    return "Less than 1 hour left";
  };

  const getTopOption = (poll: Poll) => {
    if (poll.options.length === 0) return null;
    return poll.options.reduce((prev, current) => 
      (prev.votes > current.votes) ? prev : current
    );
  };

  const getVotePercentage = (votes: number, totalVotes: number) => {
    return totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
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
        <h3 className="text-lg font-semibold text-slate-900">Active Polls</h3>
      </div>
      
      <div className="p-4 space-y-3">
        {activePolls.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">No active polls</p>
          </div>
        ) : (
          activePolls.map((poll) => {
            const topOption = getTopOption(poll);
            const topPercentage = topOption ? getVotePercentage(topOption.votes, poll.totalVotes || 0) : 0;
            
            return (
              <div key={poll.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-sm font-medium text-slate-900">{poll.question}</h4>
                  <span className="text-xs text-slate-500">
                    {getTimeLeft(poll.createdAt || new Date(), poll.duration)}
                  </span>
                </div>
                
                {topOption && (
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span>{topOption.text}</span>
                      <span className="font-medium">{topPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-primary-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${topPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{poll.totalVotes} votes</span>
                  <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 font-medium text-xs">
                    View Details
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
