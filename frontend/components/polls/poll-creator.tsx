import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertPollSchema, type InsertPoll, type PollOption } from "@/lib/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { generateId } from "@/lib/utils";
import { analytics } from "@/lib/analytics";

export default function PollCreator() {
  const [options, setOptions] = useState<PollOption[]>([
    { id: generateId(), text: "", votes: 0 },
    { id: generateId(), text: "", votes: 0 },
  ]);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertPollSchema),
    defaultValues: {
      question: "",
      options: [],
      duration: "1_day",
      privacy: "public",
      status: "active",
    },
  });

  const createPollMutation = useMutation({
    mutationFn: (data: InsertPoll) => apiRequest("POST", "/api/polls", data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      toast({
        title: "Poll created successfully",
        className: "bg-green-100 dark:bg-green-900 border-green-200 dark:border-green-800",
      });

      // Track poll creation
      analytics.track('poll_created', {
        poll_id: 'created',
        project_id: 'unknown',
        has_rewards: false,
        option_count: options.filter(opt => opt.text.trim() !== "").length
      });

      form.reset();
      setOptions([
        { id: generateId(), text: "", votes: 0 },
        { id: generateId(), text: "", votes: 0 },
      ]);
    },
    onError: (error, variables) => {
      toast({
        title: "Error",
        description: "Failed to create poll",
        variant: "destructive",
        className: "bg-red-100 dark:bg-red-900 border-red-200 dark:border-red-800",
      });

      // Track error
      analytics.track('error_occurred', {
        error_type: 'poll_creation_failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        component: 'PollCreator',
        action: 'create_poll'
      });
    },
  });

  const addOption = () => {
    setOptions([...options, { id: generateId(), text: "", votes: 0 }]);
  };

  const updateOption = (id: string, text: string) => {
    setOptions(options.map(opt => opt.id === id ? { ...opt, text } : opt));
  };

  const removeOption = (id: string) => {
    if (options.length > 2) {
      setOptions(options.filter(opt => opt.id !== id));
    }
  };

  const onSubmit = (data: InsertPoll) => {
    const filteredOptions = options.filter(opt => opt.text.trim() !== "");
    if (filteredOptions.length < 2) {
      toast({
        title: "Error",
        description: "Poll must have at least 2 options",
        variant: "destructive",
        className: "bg-red-100 dark:bg-red-900 border-red-200 dark:border-red-800",
      });
      return;
    }

    const pollData = {
      ...data,
      options: filteredOptions,
    };
    createPollMutation.mutate(pollData);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">Create New Poll</h3>
      </div>
      
      <div className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">
                    Poll Question
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="What's your question?"
                      {...field}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Options</Label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option.text}
                      onChange={(e) => updateOption(option.id, e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {options.length > 2 && (
                      <Button 
                        type="button" 
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(option.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="ghost"
                  onClick={addOption}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Option
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">
                      Duration
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1_day">1 Day</SelectItem>
                        <SelectItem value="3_days">3 Days</SelectItem>
                        <SelectItem value="1_week">1 Week</SelectItem>
                        <SelectItem value="1_month">1 Month</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="privacy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">
                      Privacy
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="invite_only">Invite Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Button
              type="submit"
              disabled={createPollMutation.isPending}
              className="w-full bg-primary-500 text-white py-2 px-4 rounded-lg hover:bg-primary-600 transition-colors"
            >
              {createPollMutation.isPending ? "Creating..." : "Create Poll"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
