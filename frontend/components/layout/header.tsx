import { Search, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProjectModal from "@/components/projects/project-modal";

interface HeaderProps {
  title: string;
  description: string;
  activeTab: "projects" | "surveys" | "polls";
}

export default function Header({ title, description, activeTab }: HeaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const getCreateButtonText = () => {
    switch (activeTab) {
      case "projects":
        return "Create Project";
      case "surveys":
        return "Create Survey";
      case "polls":
        return "Create Poll";
      default:
        return "Create";
    }
  };

  const handleCreateClick = () => {
    if (activeTab === "projects") {
      setShowModal(true);
    }
  };

  return (
    <>
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 sticky top-12 z-30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description}</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
              />
              <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
            </div>
            <Button
              onClick={handleCreateClick}
              className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              {getCreateButtonText()}
            </Button>
          </div>
        </div>
      </header>

      {activeTab === "projects" && (
        <ProjectModal isOpen={showModal} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
