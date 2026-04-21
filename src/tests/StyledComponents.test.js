import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { MemoryRouter } from 'react-router-dom';

import H2 from '../components/styled/H2';
import H3 from '../components/styled/H3';
import Icon from '../components/styled/Icon';
import Input from '../components/styled/Input';
import InputField from '../components/styled/InputField';
import Label from '../components/styled/Label';
import LabelField from '../components/styled/LabelField';
import Logo from '../components/styled/Logo';
import LogoLarge from '../components/styled/LogoLarge';
import ModalWrapper from '../components/styled/ModalWrapper';
import PageWrapper from '../components/styled/PageWrapper';
import ShareButtons from '../components/styled/ShareButtons';
import SvgMarker from '../components/styled/SvgMarker';
import Switch from '../components/styled/Switch';
import Text from '../components/styled/Text';
import TextAnchor from '../components/styled/TextAnchor';
import TextLink from '../components/styled/TextLink';
import Textarea from '../components/styled/Textarea';
import Wrapper from '../components/styled/Wrapper';

const theme = {
  colors: {
    primary: '#117ACA',
    secondary: '#1B4584',
    white: '#FFFFFF',
    gray: '#EEEEEE',
    darkgray: '#666666',
  },
};

const wrapWithTheme = (ui) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('Styled UI components', () => {
  describe('H2', () => {
    it('renders children', () => {
      wrapWithTheme(<H2>Title</H2>);
      expect(screen.getByText('Title')).toBeInTheDocument();
    });
  });

  describe('H3', () => {
    it('renders children', () => {
      wrapWithTheme(<H3>Subtitle</H3>);
      expect(screen.getByText('Subtitle')).toBeInTheDocument();
    });
  });

  describe('Icon', () => {
    it('renders icon content', () => {
      wrapWithTheme(<Icon icon={<span data-testid="icon-svg">X</span>} />);
      expect(screen.getByTestId('icon-svg')).toBeInTheDocument();
    });
  });

  describe('Input', () => {
    it('renders as input', () => {
      wrapWithTheme(<Input placeholder="Enter" />);
      expect(screen.getByPlaceholderText('Enter')).toBeInTheDocument();
    });
  });

  describe('InputField', () => {
    it('renders label and input', () => {
      render(
        <ThemeProvider theme={theme}>
          <InputField name="test" label="Test field" />
        </ThemeProvider>
      );
      expect(screen.getByText('Test field')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('Label', () => {
    it('renders children', () => {
      wrapWithTheme(<Label>Label text</Label>);
      expect(screen.getByText('Label text')).toBeInTheDocument();
    });
  });

  describe('LabelField', () => {
    it('renders label and value', () => {
      render(
        <ThemeProvider theme={theme}>
          <LabelField name="x" label="My label" value="My value" />
        </ThemeProvider>
      );
      expect(screen.getByText('My label')).toBeInTheDocument();
      expect(screen.getByText('My value')).toBeInTheDocument();
    });
  });

  describe('Logo', () => {
    it('renders with HealthDesk alt', () => {
      render(<Logo />);
      expect(screen.getByAltText('HealthDesk')).toBeInTheDocument();
    });
  });

  describe('LogoLarge', () => {
    it('renders with HealthDesk alt', () => {
      render(<LogoLarge />);
      expect(screen.getByAltText('HealthDesk')).toBeInTheDocument();
    });
  });

  describe('ModalWrapper', () => {
    it('renders children', () => {
      wrapWithTheme(<ModalWrapper $visible>Content</ModalWrapper>);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('PageWrapper', () => {
    it('renders children', () => {
      render(<PageWrapper>Page content</PageWrapper>);
      expect(screen.getByText('Page content')).toBeInTheDocument();
    });
  });

  describe('ShareButtons', () => {
    it('renders share wrapper', () => {
      const { container } = render(<ShareButtons />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('SvgMarker', () => {
    it('renders no svg when not visible', () => {
      const { container } = render(
        <ThemeProvider theme={theme}>
          <SvgMarker visible={false} baseHue={0.5} />
        </ThemeProvider>
      );
      expect(container.querySelector('svg')).toBeNull();
    });
    it('renders marker when visible', () => {
      const { container } = render(
        <ThemeProvider theme={theme}>
          <SvgMarker visible baseHue={0.5} />
        </ThemeProvider>
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Switch', () => {
    it('renders with label', () => {
      wrapWithTheme(
        <Switch label="Toggle" onChange={() => {}} defaultValue={false} />
      );
      expect(screen.getByLabelText('Toggle')).toBeInTheDocument();
    });
  });

  describe('Text', () => {
    it('renders children', () => {
      wrapWithTheme(<Text>Some text</Text>);
      expect(screen.getByText('Some text')).toBeInTheDocument();
    });
  });

  describe('TextAnchor', () => {
    it('renders link with children', () => {
      render(<TextAnchor href="/">Link</TextAnchor>);
      expect(screen.getByRole('link', { name: 'Link' })).toBeInTheDocument();
    });
  });

  describe('TextLink', () => {
    it('renders router link', () => {
      const routerFuture = {
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      };
      render(
        <MemoryRouter future={routerFuture}>
          <TextLink to="/about">About</TextLink>
        </MemoryRouter>
      );
      expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute(
        'href',
        '/about'
      );
    });
  });

  describe('Textarea', () => {
    it('renders label and textarea', () => {
      render(<Textarea name="desc" label="Description" />);
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('Wrapper', () => {
    it('renders children', () => {
      render(<Wrapper>Wrap</Wrapper>);
      expect(screen.getByText('Wrap')).toBeInTheDocument();
    });
  });
});
