import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Table, Badge, Button, StatusBadge, toast } from "@medusajs/ui"
import { Users, Trash, User as UserIcon, ArrowPath } from "@medusajs/icons"
import { useQuery } from "@tanstack/react-query"

interface AuthUser {
    id: string
    name: string | null
    email: string | null
    image: string | null
    role: string
    country: string | null
    isOnline: boolean
    lastSeen?: string | null
    createdAt?: string | null
}

const UsersPage = () => {
    // Fetch users using the standard fetch since we are in the admin dashboard context
    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ["auth_users"],
        queryFn: async () => {
            // Correct endpoint path for admin
            const response = await fetch("/admin/auth-users")
            if (!response.ok) throw new Error("Failed to fetch")
            return response.json() as Promise<{ users: AuthUser[], count: number }>
        }
    })

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this user?")) return

        try {
            const response = await fetch(`/admin/auth-users?id=${id}`, {
                method: "DELETE"
            })

            if (response.ok) {
                toast.success("Success", {
                    description: "User deleted successfully",
                })
                refetch()
            } else {
                throw new Error()
            }
        } catch (error) {
            toast.error("Error", {
                description: "Failed to delete user",
            })
        }
    }

    return (
        <Container className="divide-y p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-ui-bg-base">
                <div>
                    <Heading level="h1" className="flex items-center gap-x-2">
                        <Users /> User Auth
                    </Heading>
                    <p className="text-ui-fg-subtle txt-small">Basic user data (NextAuth/Prisma tables) + delete from dashboard</p>
                </div>
                <div className="flex items-center gap-x-2">
                    <Button
                        variant="secondary"
                        size="small"
                        onClick={() => refetch()}
                    >
                        {isFetching ? <ArrowPath className="animate-spin" /> : <ArrowPath />} Refresh
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <Table.Header>
                        <Table.Row>
                            <Table.HeaderCell>User</Table.HeaderCell>
                            <Table.HeaderCell>Email</Table.HeaderCell>
                            <Table.HeaderCell>Role</Table.HeaderCell>
                            <Table.HeaderCell>Country</Table.HeaderCell>
                            <Table.HeaderCell>Status</Table.HeaderCell>
                            <Table.HeaderCell>Last Seen</Table.HeaderCell>
                            <Table.HeaderCell>Created</Table.HeaderCell>
                            <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {isLoading ? (
                            <Table.Row>
                                <Table.Cell colSpan={8} className="text-center py-10 text-ui-fg-subtle">
                                    Loading users...
                                </Table.Cell>
                            </Table.Row>
                        ) : data?.users.map((user) => (
                            <Table.Row key={user.id}>
                                <Table.Cell className="flex items-center gap-x-3">
                                    {user.image ? (
                                        <img src={user.image} className="h-8 w-8 rounded-full border border-ui-border-base" alt="" />
                                    ) : (
                                        <div className="h-8 w-8 rounded-full bg-ui-bg-component flex items-center justify-center border border-ui-border-base">
                                            <UserIcon className="text-ui-fg-subtle" />
                                        </div>
                                    )}
                                    <span className="font-medium">{user.name || "Unnamed User"}</span>
                                </Table.Cell>
                                <Table.Cell>{user.email}</Table.Cell>
                                <Table.Cell>
                                    <Badge color={user.role === "admin" ? "orange" : "blue"}>
                                        {user.role}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell>{user.country || "N/A"}</Table.Cell>
                                <Table.Cell>
                                    <StatusBadge color={user.isOnline ? "green" : "grey"}>
                                        {user.isOnline ? "Online" : "Offline"}
                                    </StatusBadge>
                                </Table.Cell>
                                <Table.Cell>
                                    {user.lastSeen ? new Date(user.lastSeen).toLocaleString() : "-"}
                                </Table.Cell>
                                <Table.Cell>
                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
                                </Table.Cell>
                                <Table.Cell className="text-right">
                                    <Button
                                        variant="transparent"
                                        size="small"
                                        className="text-ui-fg-error"
                                        onClick={() => handleDelete(user.id)}
                                        disabled={user.role === "admin"}
                                        title={user.role === "admin" ? "Don't delete admins from here" : "Delete user"}
                                    >
                                        <Trash />
                                    </Button>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                        {!isLoading && data?.users.length === 0 && (
                            <Table.Row>
                                <Table.Cell colSpan={8} className="text-center py-10 text-ui-fg-subtle">
                                    No users found.
                                </Table.Cell>
                            </Table.Row>
                        )}
                    </Table.Body>
                </Table>
            </div>
        </Container>
    )
}

export const config = defineRouteConfig({
    label: "User Auth",
    icon: Users,
    rank: 45,
})

export default UsersPage
