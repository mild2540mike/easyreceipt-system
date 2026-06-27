import { EasyReceiptRecipeFormPage } from "@/components/easyreceipt/easyreceipt-app";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ recipeId: string }>;
}) {
  const { recipeId } = await params;

  return <EasyReceiptRecipeFormPage mode="edit" recipeId={recipeId} />;
}
