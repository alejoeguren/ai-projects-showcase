INSERT INTO public.interview_sessions (
  user_id, session_type, status, overall_score,
  substance_score, structure_score, presence_score,
  started_at, completed_at, duration_minutes,
  transcript,
  detailed_evaluation,
  top_opportunities
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'school_8',
  'completed',
  13,
  5, 4, 4,
  now() - interval '35 minutes',
  now(),
  30,
  'INTERVIEWER: Tell me about a time you led a team through a significant challenge.

CANDIDATE: At my previous role at McKinsey, I was staffed on a restructuring engagement for a Fortune 500 retail client facing declining margins. Within the first week, I identified that the team was focused on cost-cutting but missing a revenue optimization opportunity in their e-commerce channel. I made the decision to present a dual-track approach to the partner. I personally built the financial model showing a potential 15% margin improvement through digital channel optimization alongside the planned cost reductions. The partner agreed, and I led a sub-team of three analysts to develop the e-commerce strategy. We delivered both workstreams on time, and the client implemented our recommendations, resulting in a $12M annual revenue uplift and 8% margin improvement within 18 months. This experience taught me that the best consultants don''t just answer the question asked—they reframe the problem to deliver outsized impact.

INTERVIEWER: How did you manage pushback from the client who only wanted cost-cutting?

CANDIDATE: The CFO was initially skeptical because they had budget constraints. I approached it by first validating their cost-cutting priorities—I showed we were on track to deliver $8M in savings as planned. Then I positioned the e-commerce analysis as a low-cost add-on. I framed it as risk mitigation: if competitors move into this space first, the cost savings could be offset. That resonated with the CFO. I also offered to present preliminary findings within two weeks so they could evaluate without commitment. That pilot approach reduced their perceived risk and ultimately won buy-in.

INTERVIEWER: Why Yale SOM specifically?

CANDIDATE: Yale SOM''s focus on leadership for business and society directly aligns with my long-term goal of building a social enterprise in education technology. The integrated curriculum means I won''t be siloed—I''ll develop the cross-functional perspective needed to scale a mission-driven company. The SOM community''s commitment to social impact is embedded in the culture through programs like the Program on Social Enterprise. That authenticity matters to me.',
  '{"substance": {"checked": ["answered_question", "ownership_role", "decision_tradeoff", "specific_outcome"], "unchecked": [], "checklist_points": 4, "quality_bonus": 1, "score": 5, "justifications": {"answered_question": "Directly and thoroughly addressed each prompt with clear thesis statements.", "ownership_role": "Strong first-person ownership—clearly articulated personal decisions and actions.", "decision_tradeoff": "Excellent tradeoff description in proposing scope expansion vs. staying safe.", "specific_outcome": "Outstanding specificity: $12M revenue uplift, 8% margin improvement, 18-month timeline."}}, "structure": {"checked": ["fast_context", "sequenced_actions", "clear_result", "reflection_learning"], "unchecked": [], "checklist_points": 4, "quality_bonus": 0, "score": 4, "justifications": {"fast_context": "Context set efficiently—role, client type, challenge within first two sentences.", "sequenced_actions": "Clear logical sequence from diagnosis to proposal to execution.", "clear_result": "Strong quantified ending with concrete business outcomes.", "reflection_learning": "Meaningful takeaway about reframing problems for outsized impact."}}, "presence": {"checked": ["concise", "confident_language", "conversational_tone", "composure_under_pressure"], "unchecked": [], "checklist_points": 4, "quality_bonus": 0, "score": 4, "justifications": {"concise": "Focused and on-track with no significant repetition.", "confident_language": "Decisive language throughout—no hedging.", "conversational_tone": "Natural and engaging tone.", "composure_under_pressure": "Handled pushback follow-up with poise and structure."}}}'::jsonb,
  '[{"title": "Add More Reflection Depth", "related_items": ["structure.reflection_learning"], "why_it_matters": "Deeper introspection about personal growth would elevate the response.", "action": "Expand closing reflection to include how the experience shaped your leadership philosophy.", "micro_drill": "After each practice story, ask: How did this change how I lead today?", "example_rewrite": "This fundamentally shifted my approach—I now start every engagement by asking what question the client should be asking."}, {"title": "Vary Your Story Structure", "related_items": ["structure.sequenced_actions", "presence.conversational_tone"], "why_it_matters": "Adding variety in narrative approach would make responses feel less formulaic.", "action": "Experiment with opening with the outcome first, then explaining how you got there.", "micro_drill": "Practice the same story starting from three different points.", "example_rewrite": "A $12M revenue opportunity almost went unnoticed—here is how I spotted it."}, {"title": "Deepen School-Specific Connection", "related_items": ["substance.answered_question"], "why_it_matters": "The Yale answer could be more personalized with specific professors or courses.", "action": "Research 2-3 specific Yale SOM resources and weave them in naturally.", "micro_drill": "For each school, prepare one class, one professor, and one club.", "example_rewrite": "Professor Chowdhry''s work on financial innovation directly connects to the ed-tech model I want to build."}]'::jsonb
);