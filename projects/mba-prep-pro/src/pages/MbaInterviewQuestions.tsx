import { Link } from "react-router-dom";
import { BookOpen, ArrowRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Seo } from "@/components/Seo";
import { useAuth } from "@/hooks/useAuth";

interface QuestionGroup {
  category: string;
  intro: string;
  questions: { q: string; a: string }[];
}

const groups: QuestionGroup[] = [
  {
    category: "Motivation and fit",
    intro:
      "Every admissions committee opens here. They are testing whether your goals actually require this degree, from this school, at this moment.",
    questions: [
      {
        q: "Why an MBA, and why now?",
        a: "Name the specific capability gap between your current role and your target role, then explain why on-the-job learning cannot close it in the same timeframe. Anchor the timing in something concrete: a promotion track, an industry shift, or a business you plan to start.",
      },
      {
        q: "Why our school specifically?",
        a: "Cite two or three specifics — a course sequence, a lab or centre, a club you would lead — and connect each to a goal. Generic praise about culture or ranking reads as interchangeable across applications.",
      },
      {
        q: "What are your short-term and long-term goals?",
        a: "Short-term should be a plausible first job after graduation with a function, industry, and geography. Long-term can be ambitious, but the path from one to the other has to be legible.",
      },
      {
        q: "What will you do if you are not admitted?",
        a: "Show that your plan survives rejection. A credible fallback signals conviction about the goal rather than the credential.",
      },
    ],
  },
  {
    category: "Behavioural and leadership",
    intro:
      "These questions carry the most weight in scoring because they reveal how you actually operate under constraint. Structure each answer as situation, action, result.",
    questions: [
      {
        q: "Tell me about a time you led a team through a difficult situation.",
        a: "Choose a story where the difficulty was real and your decision was reversible only at a cost. Spend most of your time on what you did, not on background context.",
      },
      {
        q: "Describe a failure and what you learned.",
        a: "Pick a failure you owned rather than one caused by someone else. The learning should be specific enough that you can point to a later situation where you behaved differently.",
      },
      {
        q: "Tell me about a time you disagreed with your manager.",
        a: "Interviewers are testing judgement about when to escalate and when to commit. Describe how you made your case, and be honest about the outcome even if you lost the argument.",
      },
      {
        q: "How do you handle conflict on a team?",
        a: "Avoid abstractions. One concrete example with named tensions and a resolution beats a description of your general philosophy.",
      },
      {
        q: "Give an example of influencing without authority.",
        a: "Common in consulting and product backgrounds. Focus on how you built the coalition, not on the final deliverable.",
      },
    ],
  },
  {
    category: "Self-awareness",
    intro:
      "Interviewers are calibrating whether your self-assessment matches the evidence in your file.",
    questions: [
      {
        q: "Walk me through your resume.",
        a: "Two to three minutes, chronological, with an explicit reason for each transition. This is the most frequently mishandled question because candidates narrate instead of arguing a throughline.",
      },
      {
        q: "What is your greatest strength?",
        a: "Choose the strength your recommenders would independently name, then prove it with a short example.",
      },
      {
        q: "What is your greatest weakness?",
        a: "Name a real one with a cost you can describe, plus the mechanism you use to manage it. Disguised strengths are transparent and lower your score.",
      },
      {
        q: "How would your colleagues describe you?",
        a: "Answer in their voice, with the criticism included. Balanced answers read as more credible than uniformly positive ones.",
      },
    ],
  },
  {
    category: "Contribution and closing",
    intro:
      "The final stretch tests whether you will add to the class rather than only take from it.",
    questions: [
      {
        q: "What will you contribute to the class?",
        a: "Point to something transferable: a functional expertise, an unusual market you know well, or a community you have built before and would rebuild here.",
      },
      {
        q: "Tell me about a time you worked with people very different from you.",
        a: "Describe what specifically was different and what you had to change in how you worked, not simply that the team was diverse.",
      },
      {
        q: "Do you have any questions for me?",
        a: "Ask something only this interviewer can answer — about their own experience of the programme or a recent change to the curriculum. Questions answered on the website waste the slot.",
      },
    ],
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: groups.flatMap((group) =>
    group.questions.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  ),
};

export default function MbaInterviewQuestions() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="MBA Interview Questions: 16 Common Questions & Answers"
        description="The MBA interview questions admissions committees actually ask, grouped by theme, with guidance on how to structure a strong answer to each one."
        path="/mba-interview-questions"
        schema={faqSchema}
      />

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

      <main>
        <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              MBA Interview Questions
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Business school interviews reuse a small set of questions. Below are the
              sixteen that come up most often across top programmes, grouped by what
              the interviewer is really assessing, with notes on what separates a
              strong answer from an average one.
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 max-w-3xl py-12 space-y-12">
          {groups.map((group) => (
            <section key={group.category}>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                {group.category}
              </h2>
              <p className="text-muted-foreground mb-6">{group.intro}</p>
              <div className="space-y-4">
                {group.questions.map((item) => (
                  <Card key={item.q}>
                    <CardHeader className="pb-2">
                      <h3 className="text-lg font-semibold leading-none tracking-tight">
                        {item.q}
                      </h3>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">{item.a}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              How to practise these questions
            </h2>
            <p className="text-muted-foreground mb-4">
              Reading answers is not preparation. Interviews are scored on substance,
              structure, and presence, and only the first improves from reading. Say
              each answer out loud, time it to under two minutes, and record yourself
              at least once so you hear the filler words you cannot hear live.
            </p>
            <p className="text-muted-foreground mb-6">
              MBA Prep Pro runs the same questions as a live AI mock interview built
              from your resume and your target school's interview style, then scores
              each answer out of 15 and names your three biggest opportunities.
            </p>
            <Button size="lg" asChild>
              <Link to={user ? "/mock-interview" : "/auth"}>
                {user ? "Start a mock interview" : "Practise these questions free"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Keep reading
            </h2>
            <p className="text-muted-foreground">
              More guidance on school-specific formats and answer structure is in the{" "}
              <Link to="/blog" className="text-primary underline underline-offset-4">
                MBA interview insights blog
              </Link>
              , and{" "}
              <Link
                to="/learn-more"
                className="text-primary underline underline-offset-4"
              >
                how MBA Prep Pro scores your interviews
              </Link>{" "}
              explains the rubric behind the feedback.
            </p>
          </section>
        </div>
      </main>

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
