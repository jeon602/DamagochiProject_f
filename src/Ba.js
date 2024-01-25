import React, {useEffect, useState} from "react";
import axios from "axios";
import {Box, Center, Flex, Text, Image, Badge, Button} from "@chakra-ui/react";
import {Stomp}  from "@stomp/stompjs";
import SockJS from "sockjs-client";

function HealthBar({health}) {
// 체력바 스타일을 계산하는 함수
    const calculateHealthBarStyle = () => {
        const percentage = (health / 100) * 100;
        return {
            width: `${percentage}%`,
            backgroundColor: percentage > 70 ? 'green' : percentage > 30 ? 'yellow' : 'red',
            height: '10px',
            borderRadius: 'md',
            transition: 'width 0.3s ease',
        };
    };

    return (
        <Box w="100%" bg="gray.300" borderRadius="md" overflow="hidden">
            <Box style={calculateHealthBarStyle()} bg="green.500" h="100%" />
        </Box>
    );
}


export function Ba({message, roomId}) {

    const [userA, setUserA] = useState(null);
    const [userB, setUserB] = useState(null);
    const [userName, setUserName] = useState("");

    const [imageModuleA, setImageModuleA] = useState(null);
    const [imageModuleB, setImageModuleB] = useState(null);

    const [nowTurn, setNowTurn] = useState("");

    const [mongAHp, setMongAHp] = useState(0);
    const [mongBHp, setMongBHp] = useState(0);

    const [reload, setReload] = useState(0);

    const info = JSON.parse(message);
// A와 B의 mongId 추출
//     const mongIdA = firstMessage.sessionIds.A.mongId;
//     const mongIdB = firstMessage.sessionIds.B.mongId;

    const userAMongId = info.statsMap["A"].mongId;
    const userBMongId = info.statsMap["B"].mongId;



    const handleBattleRoomsMessage = (message) => {
        const receivedMessage = JSON.parse(message.body);
        console.log('Received message:', receivedMessage);
        // 원하는 작업 수행
        // 예를 들면, 상태 업데이트 등

        if (receivedMessage.mongAId === userAMongId) {
            setMongAHp(receivedMessage.healthA);
            setMongBHp(receivedMessage.healthB);
        }

        if (receivedMessage.mongAId === userBMongId) {
            setMongBHp(receivedMessage.healthA);
            setMongAHp(receivedMessage.healthB);
        }

        setNowTurn(receivedMessage.turn);
    };


    useEffect(() => {
        if (userAMongId === null || userBMongId === null) {
            return <div>로딩~</div>
        }
        axios.get("api/manage/mong/getUser", {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
            params: {
                userAMongId: userAMongId,
                userBMongId: userBMongId,
            }
        })
            .then(({data}) => {
                setUserA(data.userA);
                setUserB(data.userB);
                setUserName(data.userName);
                setNowTurn(data.userA.name);

                setMongAHp(data.userA.health);
                setMongBHp(data.userB.health);

                const loadImageModule = async () => {
                    if (data.userA.evolutionLevel >= 2) {
                        const imageModuleA = await import(`./img/${data.userA.mongCode}-${data.userA.evolutionLevel-1}.png`);
                        setImageModuleA(imageModuleA.default);
                    }

                    if (data.userB.evolutionLevel >= 2) {
                        const imageModuleB = await import(`./img/${data.userB.mongCode}-${data.userB.evolutionLevel-1}.png`);
                        setImageModuleB(imageModuleB.default);
                    }
                };

                loadImageModule();

                const socket = new SockJS('http://localhost:8080/ws'); // WebSocket 엔드포인트에 맞게 수정
                const stompClient = Stomp.over(socket);

                stompClient.connect({}, () => {
                    console.log('Connected to WebSocket');

                    // 이미 토픽을 구독 중인 상태에서도 추가적인 토픽 구독 가능
                    stompClient.subscribe("/topic/battleRooms/page/" + roomId, handleBattleRoomsMessage);
                });

                // 컴포넌트가 언마운트될 때 WebSocket 연결 해제
                return () => {
                    stompClient.disconnect();
                    console.log('Disconnected from WebSocket');
                };
            });


    }, [message]);


    if (userA === null || userB === null) {
        return <div>로딩중...</div>
    }

    function handleAttackClick(user1, user2, healthA, healthB) {
        console.log(user1.name + "가 " + user2.name + "에게 공격");
        axios.put("/api/manage/mong", {mongAId : user1.id, mongBId : user2.id, healthA, healthB, battleRoomId : roomId});

        // axios.get("/api/manage/mong").then(()=> console.log("완"))
    }



    if (userName === userA.memberId) {
        return (
            <div>{userA.mongId}
                {nowTurn === userA.name && <Button onClick={() =>handleAttackClick(userA , userB, mongAHp, mongBHp)}>공격</Button>}
        <Center>
                <Flex
                    display="flex"
                    flexDirection="row"
                    border="1px solid black"
                    width="70%"
                    height="700px"
                    p="4"
                    borderRadius="md"
                    boxShadow="md"
                    justifyContent="space-between"
                >
                    <Box
                        border="1px solid red"
                        display="flex"
                        width="30%"
                        height="100%"
                        p="2"
                        borderRadius="md"
                        boxShadow="sm"
                        flexDirection="column"
                        justifyContent="end"
                    >
                        <Box width="100%" height="70%" border="1px solid black" textAlign="center">
                            <HealthBar health={mongAHp} />
                            <Text fontSize="sm" mt="2" noOfLines={2}>
                                {mongAHp} / 100
                            </Text>
                            <Image src={imageModuleA} alt="" w="70%" h="70%" m="auto" mb="2" />
                            <Text fontSize="lg" fontWeight="bold" noOfLines={2}>
                                {userA.name}
                            </Text>
                            <Badge colorScheme="red" borderRadius="full" px="2" mb="2">
                                Lv. {userA.level}
                            </Badge>
                            <Text fontSize="sm" noOfLines={2}>
                                Type: {userA.attribute}
                            </Text>
                        </Box>
                    </Box>
                    <Box
                        border="1px solid blue"
                        display="flex"
                        width="30%"
                        height="100%"
                        p="2"
                        borderRadius="md"
                        boxShadow="sm"
                        flexDirection="column"
                    >
                        <Box width="100%" height="70%" border="1px solid black" textAlign="center">
                            <HealthBar health={mongBHp} />
                            <Text fontSize="sm" mt="2" noOfLines={2}>
                                {mongBHp} / 100
                            </Text>
                            <Image src={imageModuleB} alt="" w="70%" h="70%" m="auto" mb="2" />
                            <Text fontSize="lg" fontWeight="bold" noOfLines={2}>
                                {userB.name}
                            </Text>
                            <Badge colorScheme="blue" borderRadius="full" px="2" mb="2">
                                Lv. {userB.level}
                            </Badge>
                            <Text fontSize="sm" noOfLines={2}>
                                Type: {userB.attribute}
                            </Text>
                        </Box>
                    </Box>
                </Flex>
            </Center>
            </div>

        );
    } else {
        return (
            <div>
                {nowTurn === userB.name && <Button onClick={() => handleAttackClick(userB, userA, mongBHp, mongAHp)}>공격</Button>}
                <Center>
                    <Flex
                        display="flex"
                        flexDirection="row"
                        border="1px solid black"
                        width="70%"
                        height="700px"
                        p="4"
                        borderRadius="md"
                        boxShadow="md"
                        justifyContent="space-between"
                    >
                        <Box
                            border="1px solid red"
                            display="flex"
                            width="30%"
                            height="100%"
                            p="2"
                            borderRadius="md"
                            boxShadow="sm"
                            flexDirection="column"
                            justifyContent="end"
                        >
                            <Box width="100%" height="70%" border="1px solid black" textAlign="center">
                                <HealthBar health={mongBHp} />
                                <Text fontSize="sm" mt="2" noOfLines={2}>
                                    {mongBHp} / 100
                                </Text>
                                <Image src={imageModuleB} alt="" w="70%" h="70%" m="auto" mb="2" />
                                <Text fontSize="lg" fontWeight="bold" noOfLines={2}>
                                    {userB.name}
                                </Text>
                                <Badge colorScheme="red" borderRadius="full" px="2" mb="2">
                                    Lv. {userB.level}
                                </Badge>
                                <Text fontSize="sm" noOfLines={2}>
                                    Type: {userB.attribute}
                                </Text>
                            </Box>
                        </Box>
                        <Box
                            border="1px solid blue"
                            display="flex"
                            width="30%"
                            height="100%"
                            p="2"
                            borderRadius="md"
                            boxShadow="sm"
                            flexDirection="column"
                        >
                            <Box width="100%" height="70%" border="1px solid black" textAlign="center">
                                <HealthBar health={mongAHp} />
                                <Text fontSize="sm" mt="2" noOfLines={2}>
                                    {mongAHp} / 100
                                </Text>
                                <Image src={imageModuleA} alt="" w="70%" h="70%" m="auto" mb="2" />
                                <Text fontSize="lg" fontWeight="bold" noOfLines={2}>
                                    {userA.name}
                                </Text>
                                <Badge colorScheme="blue" borderRadius="full" px="2" mb="2">
                                    Lv. {userA.level}
                                </Badge>
                                <Text fontSize="sm" noOfLines={2}>
                                    Type: {userA.attribute}
                                </Text>
                            </Box>
                        </Box>
                    </Flex>
                </Center>
            </div>
        );
    }
}