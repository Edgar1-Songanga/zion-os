"use client";

export interface OrganizationTreeNode {
  id: string;
  name: string;
  organization_type: string;
  parent_id: string | null;
}

function TreeNode({
  node,
  children,
  selectedId,
}: {
  node: OrganizationTreeNode;
  children: OrganizationTreeNode[];
  selectedId?: string;
}) {
  return (
    <div className="ml-5 mt-3">
      <article className={`rounded-xl border p-4 transition ${node.id === selectedId ? "border-[#C8A24A] bg-[#FBF8F0]" : "border-slate-200 bg-white"}`}>
        <h3 className="font-semibold text-[#0C1A3D]">{node.name}</h3>
        <p className="mt-1 text-xs text-slate-500">{node.organization_type}</p>
      </article>
      {children.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          children={[]}
          selectedId={selectedId}
        />
      ))}
    </div>
  );
}

export default function OrganizationTree({
  organizations,
  selectedId,
}: {
  organizations: OrganizationTreeNode[];
  selectedId?: string;
}) {
  const ids = new Set(organizations.map((organization) => organization.id));
  const roots = organizations.filter((organization) => !organization.parent_id || !ids.has(organization.parent_id));
  const childrenByParent = new Map<string, OrganizationTreeNode[]>();
  for (const organization of organizations) {
    if (!organization.parent_id) continue;
    const children = childrenByParent.get(organization.parent_id) ?? [];
    children.push(organization);
    childrenByParent.set(organization.parent_id, children);
  }

  function renderNode(node: OrganizationTreeNode): React.ReactNode {
    return (
      <div key={node.id} className="ml-5 mt-3">
        <article className={`rounded-xl border p-4 transition ${node.id === selectedId ? "border-[#C8A24A] bg-[#FBF8F0]" : "border-slate-200 bg-white"}`}>
          <h3 className="font-semibold text-[#0C1A3D]">{node.name}</h3>
          <p className="mt-1 text-xs text-slate-500">{node.organization_type}</p>
        </article>
        {(childrenByParent.get(node.id) ?? []).map(renderNode)}
      </div>
    );
  }

  return <div>{roots.map(renderNode)}</div>;
}
