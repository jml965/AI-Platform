// FILE: client/src/components/workspace/preview-pane.tsx

type Props = {
  url: string;
};

export default function PreviewPane({ url }: Props) {

  return (
    <iframe
      src={url}
      className="w-full h-full border-0"
    />
  );

}