document.addEventListener('DOMContentLoaded', function() {
    const track = document.querySelector('.carousel-track');
    const cards = Array.from(track.children);
    const nextBtn = document.querySelector('.nav-btn.next');
    const prevBtn = document.querySelector('.nav-btn.prev');
    const carouselContainer = document.querySelector('.carousel-container');

    const modal = document.getElementById('teamModal');
    const closeBtn = document.querySelector('.close-btn');
    const modalDesc = document.getElementById('modalDesc');
    
    let currentIndex = 0;
    let autoPlayInterval;
    let typeWriterInterval;

    const teamData = {
        "Muhamad Arga Reksapati": {
            desc: "Sebagai Project Leader, Arga bertanggung jawab mengoordinasi seluruh anggota tim dan memastikan visi proyek tetap terjaga dari awal hingga akhir.",
            img: "avatar1.png"
        },
        "Ariq Naufal Rabani": {
            desc: "Ariq fokus pada pengembangan sisi server (Backend), mengelola alur data, dan memastikan keamanan logika sistem aplikasi.",
            img: "avatar2.png"
        },
        "Dhenia Putri Nuraini": {
            desc: "Dhenia bertanggung jawab merancang antarmuka pengguna (UI Designer) agar aplikasi terlihat menarik dan mudah digunakan oleh publik.",
            img: "avatar3.png"
        },
        "Davin Darmawan": {
            desc: "Davin bertugas menganalisis kebutuhan sistem (System Analyst) dan memastikan setiap fitur berjalan sesuai standar fungsionalitas.",
            img: "avatar4.png"
        }
    };

    function updateCarousel() {
        cards.forEach((card, index) => {
            card.classList.remove('active');

            let offset = index - currentIndex;

            if (offset > cards.length / 2) offset -= cards.length;
            if (offset < -cards.length / 2) offset += cards.length;

            if (index === currentIndex) {

                card.classList.add('active');
                card.style.transform = "translateX(0) scale(1.1) rotateY(0deg)";
                card.style.opacity = "1";
                card.style.zIndex = "10";
                card.style.filter = "blur(0)";
            } else {

                const xOffset = offset * 250; 
                const rotation = offset * -20;
                
                card.style.transform = `translateX(${xOffset}px) scale(0.8) rotateY(${rotation}deg)`;
                card.style.opacity = "0.4";
                card.style.filter = "blur(4px)";
                card.style.zIndex = 5 - Math.abs(offset);
            }
        });
    }

    function typeWriterEffect(element, text, speed, callback) {
        element.innerText = '';
        let i = 0;
        let timer = setInterval(() => {
            if (i < text.length) {
                element.innerText += text.charAt(i);
                i++;
            } else {
                clearInterval(timer);
                if (callback) callback(); 
            }
        }, speed);
    }

    cards.forEach(card => {
        card.addEventListener('click', function() {
            const nameFromCard = this.querySelector('h3').innerText.trim();
            const data = teamData[nameFromCard];

            if (data) {

                const elName = document.getElementById('modalName');
                const elRole = document.getElementById('modalRole');
                const elNim = document.getElementById('modalNim');
                const elDesc = document.getElementById('modalDesc');

                [elName, elRole, elNim, elDesc].forEach(el => el.innerText = '');

                document.getElementById('modalImg').src = data.img;

                modal.style.display = "flex";
                modal.classList.add('active');

                typeWriterEffect(elName, nameFromCard, 40, () => {
                    typeWriterEffect(elRole, this.querySelector('.role').innerText, 30, () => {
                        typeWriterEffect(elNim, this.querySelector('.nim').innerText, 20, () => {
                            typeWriterEffect(elDesc, data.desc, 15);
                        });
                    });
                });

                document.body.style.overflow = 'hidden';
                clearInterval(autoPlayInterval);
            }
        });
    });

    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentIndex = (currentIndex === cards.length - 1) ? 0 : currentIndex + 1;
        updateCarousel();
        resetAutoPlay();
    });

    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentIndex = (currentIndex === 0) ? cards.length - 1 : currentIndex - 1;
        updateCarousel();
        resetAutoPlay();
    });


    cards.forEach(card => {
        card.addEventListener('click', function(e) {

            e.preventDefault();

            const nameElement = this.querySelector('h3');
            if (!nameElement) return;
            
            const name = nameElement.innerText.trim();
            const data = teamData[name];

            if (data) {
                console.log("Membuka modal untuk: " + name); 

                document.getElementById('modalName').innerText = name;
                document.getElementById('modalRole').innerText = this.querySelector('.role').innerText;
                document.getElementById('modalNim').innerText = this.querySelector('.nim').innerText;
                document.getElementById('modalImg').src = data.img;

                modal.classList.add('active');
                
                startTypeWriter(modalDesc, data.desc);

                document.body.style.overflow = 'hidden';
                clearInterval(autoPlayInterval);
            }
        });
    });

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        clearInterval(typeWriterInterval);
        startAutoPlay();
    }

    closeBtn.onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    
    function startAutoPlay() {
        clearInterval(autoPlayInterval);
        autoPlayInterval = setInterval(nextSlide, 4000);
    }

    function nextSlide() {
        currentIndex = (currentIndex === cards.length - 1) ? 0 : currentIndex + 1;
        updateCarousel();
    }

    function resetAutoPlay() {
        clearInterval(autoPlayInterval);
        startAutoPlay();
    }

    updateCarousel();
    startAutoPlay();
});