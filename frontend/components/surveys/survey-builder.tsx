import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertSurveySchema, type InsertSurvey, type SurveyQuestion } from "@/lib/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { generateId } from "@/lib/utils";

export default function SurveyBuilder() {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertSurveySchema),
    defaultValues: {
      title: "",
      description: "",
      questions: [],
      status: "draft",
    },
  });

  const createSurveyMutation = useMutation({
    mutationFn: (data: InsertSurvey) => apiRequest("POST", "/api/surveys", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      toast({ title: "Survey created successfully" });
      form.reset();
      setQuestions([]);
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to create survey",
        variant: "destructive"
      });
    },
  });

  const addQuestion = () => {
    const newQuestion: SurveyQuestion = {
      id: generateId(),
      question: "",
      type: "multiple_choice",
      required: false,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<SurveyQuestion>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const onSubmit = (data: InsertSurvey) => {
    const surveyData = {
      ...data,
      questions,
    };
    createSurveyMutation.mutate(surveyData);
  };

  const saveDraft = () => {
    const data = form.getValues();
    const surveyData = {
      ...data,
      questions,
      status: "draft" as const,
    };
    createSurveyMutation.mutate(surveyData);
  };

  const publishSurvey = () => {
    const data = form.getValues();
    const surveyData = {
      ...data,
      questions,
      status: "active" as const,
    };
    createSurveyMutation.mutate(surveyData);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">Survey Builder</h3>
        <p className="text-sm text-slate-600 mt-1">Create and customize survey forms</p>
      </div>
      
      <div className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">
                    Survey Title
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter survey title..."
                      {...field}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">
                    Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Survey description..."
                      rows={3}
                      {...field}
                      value={field.value || ""}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Question Builder */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium text-slate-900">Questions</h4>
                <Button 
                  type="button" 
                  variant="ghost"
                  onClick={addQuestion}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Question
                </Button>
              </div>
              
              {questions.map((question, index) => (
                <div key={question.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-medium text-slate-600">
                      Question {index + 1}
                    </span>
                    <div className="flex items-center space-x-2">
                      <Button 
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(question.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <Input
                    placeholder="Enter your question..."
                    value={question.question}
                    onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-3"
                  />
                  <Select 
                    value={question.type} 
                    onValueChange={(value) => updateQuestion(question.id, { type: value as SurveyQuestion["type"] })}
                  >
                    <SelectTrigger className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="text_input">Text Input</SelectItem>
                      <SelectItem value="rating_scale">Rating Scale</SelectItem>
                      <SelectItem value="yes_no">Yes/No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={saveDraft}
                disabled={createSurveyMutation.isPending}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Save Draft
              </Button>
              <Button
                type="button"
                onClick={publishSurvey}
                disabled={createSurveyMutation.isPending}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600"
              >
                Publish Survey
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
