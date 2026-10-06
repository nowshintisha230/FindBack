import ItemDetails from "@/components/ItemDetails";

const LostItemDetailsPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  return <ItemDetails type="lost" id={id} />;
};

export default LostItemDetailsPage;