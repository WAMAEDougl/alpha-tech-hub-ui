import { useState } from "react";
import { Pencil, Trash2, Plus, Save, X, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomBuilds, BudgetRange, BuildRequest } from "@/contexts/CustomBuildsContext";
import { toast } from "sonner";

const STATUS_COLORS: Record<BuildRequest["status"], string> = {