import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Search, ArrowLeft, Clock, Tag, ArrowRight, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { MarkdownContent } from "@/components/MarkdownContent";
import { Seo } from "@/components/Seo";

import { useAuth } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BlogPost {
  id: string;
  title: string;
  description: string | null;
  content: string;
  category: string;
  difficulty_level: string | null;
  tags: string[] | null;
  created_at: string;
}

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('study_materials')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(posts.map(p => p.category))];

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getDifficultyColor = (level: string | null) => {
    switch (level) {
      case 'beginner': return 'bg-success/10 text-success border-success/20';
      case 'intermediate': return 'bg-warning/10 text-warning border-warning/20';
      case 'advanced': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Navigation header component
  const NavHeader = () => (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <BookOpen className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold text-foreground">MBA Prep Pro</span>
        </Link>
        <div className="flex items-center space-x-4">
          {user ? (
            <Link to="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </Link>
              <Link to="/auth">
                <Button>Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );

  if (selectedPost) {
    return (
      <div className="min-h-screen bg-background">
        <Seo
          title={`${selectedPost.title} — MBA Prep Pro`}
          description={
            selectedPost.description?.slice(0, 160) ||
            `Read ${selectedPost.title}, an MBA interview prep guide from MBA Prep Pro.`
          }
          path="/blog"
          schema={{
            "@context": "https://schema.org",
            "@type": "Article",
            headline: selectedPost.title,
            description: selectedPost.description || undefined,
            datePublished: selectedPost.created_at,
            articleSection: selectedPost.category,
            keywords: selectedPost.tags?.join(", ") || undefined,
            author: { "@type": "Organization", name: "MBA Prep Pro" },
            publisher: { "@type": "Organization", name: "MBA Prep Pro" },
          }}
        />
        <NavHeader />
        

        
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <Button
            variant="ghost"
            onClick={() => setSelectedPost(null)}
            className="mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Blog
          </Button>

          <article>
            <header className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline" className="text-xs">{selectedPost.category}</Badge>
                {selectedPost.difficulty_level && (
                  <Badge className={`text-xs ${getDifficultyColor(selectedPost.difficulty_level)}`}>
                    {selectedPost.difficulty_level}
                  </Badge>
                )}
              </div>
              
              <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">
                {selectedPost.title}
              </h1>
              
              {selectedPost.description && (
                <p className="text-xl text-muted-foreground leading-relaxed mb-6">
                  {selectedPost.description}
                </p>
              )}
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {new Date(selectedPost.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                {selectedPost.tags && selectedPost.tags.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    {selectedPost.tags.join(', ')}
                  </div>
                )}
              </div>
            </header>

            <div className="border-t pt-10">
              <MarkdownContent content={selectedPost.content} />
            </div>
          </article>

          {/* CTA Section */}
          <div className="mt-16 p-8 bg-primary/5 rounded-2xl border border-primary/10 text-center">
            <h3 className="text-2xl font-bold text-foreground mb-3">
              Ready to Ace Your MBA Interview?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Practice with AI-powered mock interviews tailored to your target schools.
            </p>
            <Link to={user ? "/dashboard" : "/auth"}>
              <Button size="lg">
                {user ? "Go to Dashboard" : "Start Practicing Free"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="py-12 bg-card border-t mt-16">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <Link to="/" className="flex items-center space-x-2 mb-4 md:mb-0">
                <BookOpen className="h-6 w-6 text-primary" />
                <span className="text-lg font-semibold text-foreground">MBA Prep Pro</span>
              </Link>
              <p className="text-muted-foreground">
                MBA Prep Pro. Empowering future business leaders.
              </p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="MBA Interview Insights — MBA Prep Pro Blog"
        description="Expert guides, tips, and strategies to help you prepare for your MBA admissions interview at top business schools."
        path="/blog"
        schema={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "MBA Interview Insights",
          url: "https://mbapreppro.com/blog",
          description:
            "Expert guides, tips, and strategies for MBA admissions interviews.",
        }}
      />
      <NavHeader />


      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            MBA Interview Insights
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Expert guides, tips, and strategies to help you prepare for your MBA admissions interview.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-10 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredPosts.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-foreground mb-2">No articles found</h3>
              <p className="text-muted-foreground">
                {searchQuery || selectedCategory !== "all"
                  ? "Try adjusting your search or filter."
                  : "Check back later for new content."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {filteredPosts.map((post) => (
              <Card 
                key={post.id} 
                className="cursor-pointer group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20"
                onClick={() => setSelectedPost(post)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-xs">{post.category}</Badge>
                    {post.difficulty_level && (
                      <Badge className={`text-xs ${getDifficultyColor(post.difficulty_level)}`}>
                        {post.difficulty_level}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl leading-snug group-hover:text-primary transition-colors">
                    {post.title}
                  </CardTitle>
                  {post.description && (
                    <CardDescription className="line-clamp-2 mt-2">
                      {post.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(post.created_at).toLocaleDateString()}
                    </div>
                    <span className="text-primary font-medium group-hover:underline">
                      Read full article: {post.title} →
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Start Practicing?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Put these insights into action with AI-powered mock interviews.
          </p>
          <Link to={user ? "/dashboard" : "/auth"}>
            <Button size="lg" className="bg-white text-primary hover:bg-white/90">
              {user ? "Go to Dashboard" : "Get Started Free"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <Link to="/" className="flex items-center space-x-2 mb-4 md:mb-0">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold text-foreground">MBA Prep Pro</span>
            </Link>
            <p className="text-muted-foreground">
              MBA Prep Pro. Empowering future business leaders.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
