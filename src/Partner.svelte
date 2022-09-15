<script>
    import PartnerSignUp from "./PartnerSignUp.svelte";
    
    function signUp(){
        window.$('#signup').modal('show')
    }

</script>
<h3 class='head-text'>광고 파트너</h3>
<table class='partner'>
    <thead>
        <td>아이콘</td>
        <td>파트너 이름</td>
        <td>활성화 여부</td>
        <td></td>
    </thead>
    <tbody>
        <tr>
            <td></td>
            <td>3dpop</td>
            <td>비활성화</td>
            <td><span class='config'>상세 설정</span></td>
        </tr>
        <tr>
            <td></td>
            <td>a.f.z</td>
            <td>비활성화</td>
            <td><span class='config'>상세 설정</span></td>
        </tr>
        <tr>
            <td></td>
            <td>Ad.zip(애드짚)</td>
            <td><span class='active'>활성화</span></td>
            <td><span class='config'>상세 설정</span></td>
        </tr>
        <tr>
            <td></td>
            <td>ADBC</td>
            <td>비활성화</td>
            <td><span class='config'>상세 설정</span></td>
        </tr>
        <tr>
            <td></td>
            <td>adbox</td>
            <td>비활성화</td>
            <td><span class='config'>상세 설정</span></td>
        </tr>
        <tr>
            <td></td>
            <td>AdBrix</td>
            <td>비활성화</td>
            <td><span class='config'>상세 설정</span></td>
        </tr>
        <tr>
            <td></td>
            <td>adcolony</td>
            <td>비활성화</td>
            <td><span class='config'>상세 설정</span></td>
        </tr>
        <tr>
            <td></td>
            <td>adison</td>
            <td>비활성화</td>
            <td><span class='config'>상세 설정</span></td>
        </tr>
    </tbody>
</table>

<button type="button" on:click={signUp} class="btn btn-primary">파트너 등록</button>

<PartnerSignUp/>

<style>

</style>

