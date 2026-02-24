/**
 * ROI & parent helpers — resolve student_id for student or linked parent.
 * Per contracts/api-parents.md: student accesses own data; parent accesses linked student's data.
 */
import { createDbClient } from "@repo/db";

export type ResolveStudentResult =
  | { ok: true; studentId: string; isParent: boolean }
  | { ok: false; error: string; status: number };

interface AuthUser {
  id: string;
}

/**
 * Resolves the student_id for ROI/comparison APIs.
 * - Student: uses own id (optionally validate student_id query param matches)
 * - Parent: must be linked; uses student_id from query or sole linked student
 *
 * @param user - Authenticated user from supabase.auth.getUser()
 * @param studentIdParam - Optional student_id from query (parent may pass linked student)
 */
export async function resolveStudentIdForRoi(
  user: AuthUser,
  studentIdParam?: string | null
): Promise<ResolveStudentResult> {
  const db = createDbClient();

  // Check if user is a linked parent (has rows in parent_students where parent_id = user.id)
  const { data: parentLinks } = await db
    .from("parent_students")
    .select("student_id")
    .eq("parent_id", user.id);

  const isParent = Array.isArray(parentLinks) && parentLinks.length > 0;

  if (isParent) {
    const linkedStudentIds = parentLinks!.map((r) => r.student_id);
    if (studentIdParam) {
      if (!linkedStudentIds.includes(studentIdParam)) {
        return {
          ok: false,
          error: "Parent not linked to this student",
          status: 403,
        };
      }
      return { ok: true, studentId: studentIdParam, isParent: true };
    }
    if (linkedStudentIds.length === 1) {
      const sid = linkedStudentIds[0];
      if (sid) return { ok: true, studentId: sid, isParent: true };
    }
    return {
      ok: false,
      error: "Parent must specify student_id when linked to multiple students",
      status: 400,
    };
  }

  // Student: use own id; ignore or validate studentIdParam
  if (studentIdParam && studentIdParam !== user.id) {
    return {
      ok: false,
      error: "Students can only access their own data",
      status: 403,
    };
  }
  return { ok: true, studentId: user.id, isParent: false };
}
