import ItemDetails from "@/components/ItemDetails";

const FoundItemDetailsPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  return <ItemDetails type="found" id={id} />;
};

export default FoundItemDetailsPage;