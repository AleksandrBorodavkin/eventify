import type { ComponentType, JSX } from 'react';
import { IndexPage } from '@/pages/IndexPage/IndexPage';
import {EventDetails} from "@/pages/EventDetails/EventDetails.tsx";
import {HelpPage} from "@/pages/HelpPage/HelpPage.tsx";
import {ArchivePage} from "@/pages/ArchivePage/ArchivePage.tsx";

interface Route {
  path: string;
  Component: ComponentType;
  title?: string;
  icon?: JSX.Element;
}

export const routes: Route[] = [
  { path: '/', Component: IndexPage },
  { path: '/events/:eventId', Component: EventDetails },
  { path: '/archive', Component: ArchivePage },
  { path: '/help', Component: HelpPage }
];
