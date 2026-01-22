import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
    return {
        redirect: {
            destination: '/wizard/step1',
            permanent: false,
        },
    };
};

export default function Home() {
    return null;
}
