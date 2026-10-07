 import { useState, useCallback } from 'react';
 import readXlsxFile from 'read-excel-file';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import { Button } from '@/components/ui/button';
 import { Label } from '@/components/ui/label';
 import { Progress } from '@/components/ui/progress';
 import { Badge } from '@/components/ui/badge';
 import { Checkbox } from '@/components/ui/checkbox';
 import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
 import {
   Accordion,
   AccordionContent,
   AccordionItem,
   AccordionTrigger,
 } from '@/components/ui/accordion';
 import { Upload, FileSpreadsheet, Check, AlertTriangle, X } from 'lucide-react';
 import { supabase } from '@/integrations/supabase/client';
 import { useToast } from '@/hooks/use-toast';
 
 interface School {
   id: number;
   name: string;
 }
 
 interface GroupedQuestions {
   schoolName: string;
   matchedSchoolId: number | null;
   questions: string[];
   isGeneral: boolean;
 }
 
 interface BulkUploadDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   schools: School[];
   existingBanks: { school_id: number | null }[];
   onSuccess: () => void;
 }
 
 type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';
 
 export const BulkUploadDialog = ({
   open,
   onOpenChange,
   schools,
   existingBanks,
   onSuccess,
 }: BulkUploadDialogProps) => {
   const { toast } = useToast();
   const [step, setStep] = useState<Step>('upload');
   const [file, setFile] = useState<File | null>(null);
   const [headers, setHeaders] = useState<string[]>([]);
   const [rows, setRows] = useState<string[][]>([]);
   const [schoolColumn, setSchoolColumn] = useState<string>('');
   const [questionColumn, setQuestionColumn] = useState<string>('');
   const [groupedData, setGroupedData] = useState<GroupedQuestions[]>([]);
   const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
   const [setActive, setSetActive] = useState(true);
   const [progress, setProgress] = useState(0);
   const [importResults, setImportResults] = useState<{ created: number; updated: number }>({ created: 0, updated: 0 });
 
   const resetState = useCallback(() => {
     setStep('upload');
     setFile(null);
     setHeaders([]);
     setRows([]);
     setSchoolColumn('');
     setQuestionColumn('');
     setGroupedData([]);
     setImportMode('append');
     setSetActive(true);
     setProgress(0);
     setImportResults({ created: 0, updated: 0 });
   }, []);
 
   const handleClose = useCallback(() => {
     resetState();
     onOpenChange(false);
   }, [resetState, onOpenChange]);
 
   const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
     const selectedFile = e.target.files?.[0];
     if (!selectedFile) return;
 
     setFile(selectedFile);
 
     try {
        const rows = await readXlsxFile(selectedFile);

        if (rows.length < 2) {
          toast({
            title: 'Invalid file',
            description: 'The file must have at least a header row and one data row',
            variant: 'destructive',
          });
          return;
        }

        const headerRow = rows[0].map(h => String(h || '').trim());
        const dataRows = rows.slice(1).filter(row => row.some(cell => cell));

        setHeaders(headerRow);
        setRows(dataRows.map(row => row.map(cell => String(cell || '').trim())));
       setStep('mapping');
     } catch (error) {
       console.error('Error parsing file:', error);
       toast({
         title: 'Error parsing file',
         description: 'Could not read the Excel file. Please ensure it is a valid .xlsx or .csv file.',
         variant: 'destructive',
       });
     }
   }, [toast]);
 
   const handleDrop = useCallback((e: React.DragEvent) => {
     e.preventDefault();
     const droppedFile = e.dataTransfer.files[0];
     if (droppedFile) {
       const fakeEvent = { target: { files: [droppedFile] } } as unknown as React.ChangeEvent<HTMLInputElement>;
       handleFileChange(fakeEvent);
     }
   }, [handleFileChange]);
 
   const fuzzyMatch = useCallback((name: string, schools: School[]): number | null => {
     const normalized = name.toLowerCase().trim();
     
     // Check for "general" or empty
     if (!normalized || normalized === 'general' || normalized === 'all schools') {
       return null; // null = general
     }
 
     // Exact match first
     const exact = schools.find(s => s.name.toLowerCase() === normalized);
     if (exact) return exact.id;
 
     // Contains match
     const contains = schools.find(s => 
       s.name.toLowerCase().includes(normalized) || 
       normalized.includes(s.name.toLowerCase())
     );
     if (contains) return contains.id;
 
     // Word-based fuzzy match
     const words = normalized.split(/\s+/).filter(w => w.length > 2);
     const bestMatch = schools.find(s => {
       const schoolWords = s.name.toLowerCase().split(/\s+/);
       return words.some(w => schoolWords.some(sw => sw.includes(w) || w.includes(sw)));
     });
     if (bestMatch) return bestMatch.id;
 
     return -1; // -1 = unmatched
   }, []);
 
   const handleColumnMapping = useCallback(() => {
     if (!schoolColumn || !questionColumn) {
       toast({
         title: 'Select columns',
         description: 'Please select both the school name and question columns',
         variant: 'destructive',
       });
       return;
     }
 
     const schoolIdx = headers.indexOf(schoolColumn);
     const questionIdx = headers.indexOf(questionColumn);
 
     // Group questions by school name
     const grouped = new Map<string, string[]>();
     
     rows.forEach(row => {
       const schoolName = row[schoolIdx] || '';
       const question = row[questionIdx] || '';
       
       if (!question.trim()) return; // Skip empty questions
       
       const key = schoolName.trim() || 'General';
       if (!grouped.has(key)) {
         grouped.set(key, []);
       }
       grouped.get(key)!.push(question.trim());
     });
 
     // Match to database schools
     const result: GroupedQuestions[] = [];
     grouped.forEach((questions, schoolName) => {
       const matchedId = fuzzyMatch(schoolName, schools);
       const isGeneral = schoolName.toLowerCase() === 'general' || !schoolName.trim();
       
       result.push({
         schoolName,
         matchedSchoolId: isGeneral ? null : matchedId,
         questions,
         isGeneral,
       });
     });
 
     // Sort: General first, then matched, then unmatched
     result.sort((a, b) => {
       if (a.isGeneral) return -1;
       if (b.isGeneral) return 1;
       if (a.matchedSchoolId === -1 && b.matchedSchoolId !== -1) return 1;
       if (b.matchedSchoolId === -1 && a.matchedSchoolId !== -1) return -1;
       return 0;
     });
 
     setGroupedData(result);
     setStep('preview');
   }, [schoolColumn, questionColumn, headers, rows, schools, fuzzyMatch, toast]);
 
   const updateSchoolMatch = useCallback((schoolName: string, newSchoolId: number | null) => {
     setGroupedData(prev => 
       prev.map(g => 
         g.schoolName === schoolName 
           ? { ...g, matchedSchoolId: newSchoolId }
           : g
       )
     );
   }, []);
 
   const handleImport = useCallback(async () => {
     // Filter out unmatched schools (id === -1)
     const validGroups = groupedData.filter(g => g.matchedSchoolId !== -1);
     
     if (validGroups.length === 0) {
       toast({
         title: 'No valid schools',
         description: 'Please match at least one school before importing',
         variant: 'destructive',
       });
       return;
     }
 
     setStep('importing');
     setProgress(0);
 
     let created = 0;
     let updated = 0;
     const total = validGroups.length;
 
     for (let i = 0; i < validGroups.length; i++) {
       const group = validGroups[i];
       const schoolId = group.isGeneral ? null : group.matchedSchoolId;
       const questionsText = group.questions.join('\n');
       
       // Check if question bank exists
       const existingBank = existingBanks.find(b => b.school_id === schoolId);
 
       if (existingBank) {
         // Update existing
         if (importMode === 'replace') {
           const { error } = await supabase
             .from('school_interview_questions')
             .update({
               questions_text: questionsText,
               is_active: setActive,
             })
             .eq('school_id', schoolId as number);
 
           if (error) {
             console.error('Error updating:', error);
           } else {
             updated++;
           }
         } else {
           // Append mode - fetch existing and append
           const { data: existing } = await supabase
             .from('school_interview_questions')
             .select('questions_text')
             .eq('school_id', schoolId as number)
             .single();
 
           const newText = existing?.questions_text 
             ? `${existing.questions_text}\n${questionsText}`
             : questionsText;
 
           const { error } = await supabase
             .from('school_interview_questions')
             .update({
               questions_text: newText,
               is_active: setActive,
             })
             .eq('school_id', schoolId as number);
 
           if (error) {
             console.error('Error updating:', error);
           } else {
             updated++;
           }
         }
       } else {
         // Create new
         const { error } = await supabase
           .from('school_interview_questions')
           .insert({
             school_id: schoolId,
             questions_text: questionsText,
             is_active: setActive,
           });
 
         if (error) {
           console.error('Error creating:', error);
         } else {
           created++;
         }
       }
 
       setProgress(((i + 1) / total) * 100);
     }
 
     setImportResults({ created, updated });
     setStep('complete');
     onSuccess();
   }, [groupedData, existingBanks, importMode, setActive, toast, onSuccess]);
 
   const getSchoolNameById = useCallback((id: number | null): string => {
     if (id === null) return 'General - All Schools';
     const school = schools.find(s => s.id === id);
     return school?.name || 'Unknown';
   }, [schools]);
 
   return (
     <Dialog open={open} onOpenChange={handleClose}>
       <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle>Bulk Upload Questions</DialogTitle>
           <DialogDescription>
             Upload an Excel file with interview questions organized by school
           </DialogDescription>
         </DialogHeader>
 
         {/* Step 1: Upload */}
         {step === 'upload' && (
           <div
             className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
             onDrop={handleDrop}
             onDragOver={(e) => e.preventDefault()}
             onClick={() => document.getElementById('file-upload')?.click()}
           >
             <input
               id="file-upload"
               type="file"
               accept=".xlsx,.xls,.csv"
               onChange={handleFileChange}
               className="hidden"
             />
             <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
             <p className="text-lg font-medium mb-2">Drop your Excel file here</p>
             <p className="text-sm text-muted-foreground mb-4">
               or click to browse (.xlsx, .csv)
             </p>
             {file && (
               <div className="flex items-center justify-center gap-2 text-primary">
                 <FileSpreadsheet className="h-4 w-4" />
                 <span>{file.name}</span>
               </div>
             )}
           </div>
         )}
 
         {/* Step 2: Column Mapping */}
         {step === 'mapping' && (
           <div className="space-y-6">
             <div className="flex items-center gap-2 text-sm text-muted-foreground">
               <FileSpreadsheet className="h-4 w-4" />
               <span>{file?.name}</span>
               <Badge variant="secondary">{rows.length} rows</Badge>
             </div>
 
             <div className="grid gap-4">
               <div className="space-y-2">
                 <Label>School Name Column</Label>
                 <Select value={schoolColumn} onValueChange={setSchoolColumn}>
                   <SelectTrigger>
                     <SelectValue placeholder="Select the column containing school names" />
                   </SelectTrigger>
                   <SelectContent>
                     {headers.map((header, idx) => (
                       <SelectItem key={idx} value={header}>
                         {header}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
 
               <div className="space-y-2">
                 <Label>Question Column</Label>
                 <Select value={questionColumn} onValueChange={setQuestionColumn}>
                   <SelectTrigger>
                     <SelectValue placeholder="Select the column containing questions" />
                   </SelectTrigger>
                   <SelectContent>
                     {headers.map((header, idx) => (
                       <SelectItem key={idx} value={header}>
                         {header}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
             </div>
 
             <DialogFooter>
               <Button variant="outline" onClick={() => setStep('upload')}>
                 Back
               </Button>
               <Button onClick={handleColumnMapping} disabled={!schoolColumn || !questionColumn}>
                 Continue
               </Button>
             </DialogFooter>
           </div>
         )}
 
         {/* Step 3: Preview */}
         {step === 'preview' && (
           <div className="space-y-6">
             <div className="flex items-center gap-2 text-sm text-muted-foreground">
               <span>Found {groupedData.length} schools with {groupedData.reduce((acc, g) => acc + g.questions.length, 0)} total questions</span>
             </div>
 
             <Accordion type="multiple" className="w-full">
               {groupedData.map((group, idx) => {
                 const isMatched = group.matchedSchoolId !== -1;
                 const hasExisting = existingBanks.some(b => b.school_id === group.matchedSchoolId);
                 
                 return (
                   <AccordionItem key={idx} value={`school-${idx}`}>
                     <AccordionTrigger className="hover:no-underline">
                       <div className="flex items-center gap-3 flex-1">
                         {isMatched ? (
                            <Check className="h-4 w-4 text-primary" />
                         ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                         )}
                         <span className="font-medium">{group.schoolName}</span>
                         <Badge variant="secondary" className="ml-auto mr-2">
                           {group.questions.length} questions
                         </Badge>
                         {hasExisting && (
                           <Badge variant="outline" className="text-xs">
                             Existing
                           </Badge>
                         )}
                       </div>
                     </AccordionTrigger>
                     <AccordionContent>
                       <div className="space-y-4 pl-7">
                         {!isMatched && !group.isGeneral && (
                           <div className="space-y-2">
                              <Label className="text-amber-600 dark:text-amber-400">No match found. Select a school:</Label>
                             <Select
                               value={group.matchedSchoolId?.toString() || ''}
                               onValueChange={(v) => updateSchoolMatch(group.schoolName, parseInt(v))}
                             >
                               <SelectTrigger>
                                 <SelectValue placeholder="Select a school to match" />
                               </SelectTrigger>
                               <SelectContent>
                                 {schools.map(school => (
                                   <SelectItem key={school.id} value={school.id.toString()}>
                                     {school.name}
                                   </SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>
                           </div>
                         )}
                         {isMatched && !group.isGeneral && (
                           <p className="text-sm text-muted-foreground">
                             Matched to: <strong>{getSchoolNameById(group.matchedSchoolId)}</strong>
                           </p>
                         )}
                         <div className="text-sm text-muted-foreground max-h-32 overflow-y-auto space-y-1">
                           {group.questions.slice(0, 5).map((q, qIdx) => (
                             <p key={qIdx} className="truncate">• {q}</p>
                           ))}
                           {group.questions.length > 5 && (
                             <p className="text-xs">...and {group.questions.length - 5} more</p>
                           )}
                         </div>
                       </div>
                     </AccordionContent>
                   </AccordionItem>
                 );
               })}
             </Accordion>
 
             {/* Import Options */}
             <div className="space-y-4 border-t pt-4">
               <div className="space-y-3">
                 <Label>For schools with existing question banks:</Label>
                 <RadioGroup value={importMode} onValueChange={(v) => setImportMode(v as 'append' | 'replace')}>
                   <div className="flex items-center space-x-2">
                     <RadioGroupItem value="append" id="append" />
                     <Label htmlFor="append" className="font-normal cursor-pointer">
                       Append new questions to existing
                     </Label>
                   </div>
                   <div className="flex items-center space-x-2">
                     <RadioGroupItem value="replace" id="replace" />
                     <Label htmlFor="replace" className="font-normal cursor-pointer">
                       Replace existing questions entirely
                     </Label>
                   </div>
                 </RadioGroup>
               </div>
 
               <div className="flex items-center space-x-2">
                 <Checkbox
                   id="set-active"
                   checked={setActive}
                   onCheckedChange={(checked) => setSetActive(checked as boolean)}
                 />
                 <Label htmlFor="set-active" className="font-normal cursor-pointer">
                   Set all imported question banks as active
                 </Label>
               </div>
             </div>
 
             <DialogFooter>
               <Button variant="outline" onClick={() => setStep('mapping')}>
                 Back
               </Button>
               <Button 
                 onClick={handleImport}
                 disabled={groupedData.filter(g => g.matchedSchoolId !== -1).length === 0}
               >
                 Import {groupedData.filter(g => g.matchedSchoolId !== -1).length} Schools
               </Button>
             </DialogFooter>
           </div>
         )}
 
         {/* Step 4: Importing */}
         {step === 'importing' && (
           <div className="py-8 space-y-6">
             <div className="text-center">
               <p className="text-lg font-medium mb-2">Importing questions...</p>
               <p className="text-sm text-muted-foreground">Please wait while we upload your data</p>
             </div>
             <Progress value={progress} className="w-full" />
             <p className="text-center text-sm text-muted-foreground">
               {Math.round(progress)}% complete
             </p>
           </div>
         )}
 
         {/* Step 5: Complete */}
         {step === 'complete' && (
           <div className="py-8 space-y-6 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-primary" />
             </div>
             <div>
               <p className="text-lg font-medium mb-2">Import Complete!</p>
               <p className="text-sm text-muted-foreground">
                 Created {importResults.created} new question banks
                 {importResults.updated > 0 && `, updated ${importResults.updated} existing`}
               </p>
             </div>
             <Button onClick={handleClose}>Done</Button>
           </div>
         )}
       </DialogContent>
     </Dialog>
   );
 };