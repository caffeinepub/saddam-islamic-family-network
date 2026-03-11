import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { Principal } from "@icp-sdk/core/principal";
import { Users } from "lucide-react";
import { motion } from "motion/react";
import { MobileHeader } from "../components/TopNav";
import { useGetFeedAuthors } from "../hooks/useQueries";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface MembersPageProps {
  onSelectMember: (principal: Principal) => void;
}

export default function MembersPage({ onSelectMember }: MembersPageProps) {
  const { data: members, isLoading } = useGetFeedAuthors();

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader />

      <div className="max-w-4xl mx-auto px-4 pt-20 pb-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 text-center"
        >
          <div className="inline-flex items-center gap-2 bg-islamic-green/10 border border-islamic-green/20 rounded-full px-4 py-1.5 mb-3">
            <Users className="w-4 h-4 text-islamic-green" />
            <span className="text-xs font-semibold text-islamic-green uppercase tracking-wider">
              Family Network
            </span>
          </div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-foreground mb-1">
            Family Members
          </h1>
          <p className="text-muted-foreground text-sm">
            Connect with your family — click a member to view their profile
          </p>
          {/* Arabic decorative text */}
          <div className="mt-3 inline-block bg-card border border-border rounded-xl px-5 py-1.5">
            <span className="font-arabic text-islamic-gold text-base">
              مَا شَاءَ اللَّهُ
            </span>
          </div>
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <div
            data-ocid="members.loading_state"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div
                key={n}
                className="bg-card rounded-2xl p-4 flex flex-col items-center gap-3 card-glow"
              >
                <Skeleton className="w-16 h-16 rounded-full" />
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-3 w-28 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!members || members.length === 0) && (
          <motion.div
            data-ocid="members.empty_state"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="bg-card rounded-2xl card-glow p-12 text-center"
          >
            <span className="text-5xl block mb-4">🕌</span>
            <h3 className="font-display font-bold text-foreground text-lg mb-2">
              No Family Members Yet
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Invite your family members to join and their profiles will appear
              here.
            </p>
            <div className="mt-4 inline-block">
              <span className="font-arabic text-islamic-green text-sm">
                إِنَّ اللَّهَ مَعَ الصَّابِرِينَ
              </span>
            </div>
          </motion.div>
        )}

        {/* Members Grid */}
        {!isLoading && members && members.length > 0 && (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.06,
                },
              },
            }}
          >
            {members.map(({ principal, profile }, index) => {
              const username =
                profile?.username ?? `${principal.toString().slice(0, 8)}…`;
              const bio = profile?.bio ?? "";

              let profilePhotoUrl: string | undefined;
              try {
                profilePhotoUrl = profile?.profilePhotoId?.getDirectURL();
              } catch {
                profilePhotoUrl = undefined;
              }

              const ocidIndex = index + 1;

              return (
                <motion.button
                  key={principal.toString()}
                  type="button"
                  data-ocid={`members.item.${ocidIndex}`}
                  onClick={() => onSelectMember(principal)}
                  variants={{
                    hidden: { opacity: 0, y: 16, scale: 0.95 },
                    visible: { opacity: 1, y: 0, scale: 1 },
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  whileHover={{ y: -3, transition: { duration: 0.18 } }}
                  whileTap={{ scale: 0.97 }}
                  className="group bg-card rounded-2xl p-4 flex flex-col items-center gap-3 card-glow hover:border-islamic-green/40 border border-transparent transition-all duration-200 cursor-pointer text-left w-full"
                >
                  {/* Avatar */}
                  <Avatar className="w-16 h-16 border-2 border-islamic-green/30 group-hover:border-islamic-green/60 transition-colors">
                    {profilePhotoUrl ? (
                      <img
                        src={profilePhotoUrl}
                        alt={username}
                        className="object-cover w-full h-full rounded-full"
                        loading="lazy"
                      />
                    ) : (
                      <AvatarFallback className="bg-islamic-green text-white font-bold text-lg">
                        {getInitials(username)}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  {/* Name */}
                  <div className="text-center w-full">
                    <p className="font-semibold text-foreground text-sm truncate w-full text-center">
                      {username}
                    </p>
                    {bio && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 text-center leading-relaxed">
                        {bio}
                      </p>
                    )}
                  </div>

                  {/* View profile indicator */}
                  <span className="text-[10px] text-islamic-green font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    View Profile →
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
