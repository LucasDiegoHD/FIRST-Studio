"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ExternalLink, Github } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StudioShell } from "@/components/studio/studio-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useProject } from "@/context/project-context";

function AuthorAvatar({
  src,
  alt,
  initials,
}: {
  src: string;
  alt: string;
  initials: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#3b6bb5] bg-[#142c4f] font-headline text-base font-bold text-white">
        {initials}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={56}
      height={56}
      onError={() => setFailed(true)}
      className="h-14 w-14 shrink-0 rounded-xl border border-[#3b6bb5] bg-[#142c4f] object-cover"
    />
  );
}

const OSS_PROJECTS = [
  {
    name: "Ciprix",
    license: "GPL-3.0",
    url: "https://github.com/23daniel3/Ciprix",
    desc: {
      pt: "Biblioteca FRC com StateSubsystem, SuperStructure, @AutoCommandFactory e simulação.",
      en: "FRC library providing StateSubsystem, SuperStructure, @AutoCommandFactory, and sim.",
    },
  },
  {
    name: "WPILib",
    license: "BSD-3-Clause",
    url: "https://github.com/wpilibsuite/allwpilib",
    desc: {
      pt: "Framework oficial de controle, comandos, cinemática e simulação da FIRST Robotics Competition.",
      en: "Official FIRST Robotics Competition control, command, kinematics, and simulation suite.",
    },
  },
  {
    name: "AdvantageKit",
    license: "BSD-3-Clause",
    url: "https://github.com/Mechanical-Advantage/AdvantageKit",
    desc: {
      pt: "Infraestrutura de logging determinístico e replay IO pela Mechanical Advantage (6328).",
      en: "Deterministic logging and IO replay framework by Mechanical Advantage (6328).",
    },
  },
  {
    name: "CTRE Phoenix 6 / 5",
    license: "CTRE License",
    url: "https://v6.docs.ctr-electronics.com/",
    desc: {
      pt: "SDK e drivers para controladores Talon FX, Talon SRX, CANcoder e Pigeon 2.",
      en: "SDK and drivers for Talon FX, Talon SRX, CANcoder, and Pigeon 2 hardware.",
    },
  },
  {
    name: "REVLib",
    license: "BSD-3-Clause",
    url: "https://docs.revrobotics.com/revlib",
    desc: {
      pt: "Biblioteca de controle para SPARK MAX, SPARK Flex e sensores REV Robotics.",
      en: "Control library for SPARK MAX, SPARK Flex, and REV Robotics sensors.",
    },
  },
  {
    name: "PathPlanner",
    license: "MIT",
    url: "https://github.com/mjansen4857/pathplanner",
    desc: {
      pt: "Planejador de trajetórias, AutoBuilder e pathfinding para autônomos FRC.",
      en: "Trajectory planner, AutoBuilder, and pathfinding for FRC autonomous routines.",
    },
  },
  {
    name: "YAGSL",
    license: "MIT",
    url: "https://github.com/BroncBotz3481/YAGSL",
    desc: {
      pt: "Yet Another Generic Swerve Library para configuração declarativa de swerve drive.",
      en: "Yet Another Generic Swerve Library for declarative swerve drivetrain setup.",
    },
  },
] as const;

export default function CreditsPage() {
  const { locale, t } = useProject();

  const authors = [
    {
      name: "Daniel Cipriani",
      handle: "@23daniel3",
      initials: "DC",
      avatar: "https://github.com/23daniel3.png",
      githubUrl: "https://github.com/23daniel3",
      projectUrl: "https://github.com/23daniel3/Ciprix",
      projectLabel: "23daniel3/Ciprix",
      role: t("credits.daniel_role"),
      bio: t("credits.daniel_bio"),
    },
    {
      name: "LucasDiegoHD",
      handle: "@LucasDiegoHD",
      initials: "LD",
      avatar: "https://github.com/LucasDiegoHD.png",
      githubUrl: "https://github.com/LucasDiegoHD",
      projectUrl: "https://github.com/LucasDiegoHD/FIRST-Studio",
      projectLabel: "LucasDiegoHD/FIRST-Studio",
      role: t("credits.lucas_role"),
      bio: t("credits.lucas_bio"),
    },
  ];

  return (
    <StudioShell activeRoute="credits">
      <PageHeader title={t("credits.title")} description={t("credits.subtitle")} />

      <section className="space-y-4">
        <h2 className="font-mono text-xs uppercase tracking-wider text-slate-400">
          {t("credits.authors_heading")}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {authors.map((person) => (
            <Card key={person.handle}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start gap-4">
                  <AuthorAvatar
                    src={person.avatar}
                    alt={person.name}
                    initials={person.initials}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-headline text-lg font-semibold text-white">
                        {person.name}
                      </h3>
                      <Badge variant="default">{person.role}</Badge>
                    </div>
                    <a
                      href={person.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs text-[#93c5fd] hover:text-white"
                    >
                      <Github className="h-3.5 w-3.5" />
                      <span>{person.handle}</span>
                    </a>
                  </div>
                </div>
                <p className="text-[13px] leading-relaxed text-slate-300">{person.bio}</p>
                <div className="pt-1">
                  <a
                    href={person.projectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-400 hover:text-[#93c5fd]"
                  >
                    <span>{person.projectLabel}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-mono text-xs uppercase tracking-wider text-slate-400">
          {t("credits.projects_heading")}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {OSS_PROJECTS.map((item) => (
            <a
              key={item.name}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="group rounded-xl border border-[#22304a] bg-[#131c2e] p-4 transition-colors hover:border-[#3b6bb5] hover:bg-[#19253d]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-headline text-sm font-semibold text-white group-hover:text-[#93c5fd]">
                  {item.name}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {item.license}
                </Badge>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                {item.desc[locale]}
              </p>
            </a>
          ))}
        </div>
      </section>
    </StudioShell>
  );
}
