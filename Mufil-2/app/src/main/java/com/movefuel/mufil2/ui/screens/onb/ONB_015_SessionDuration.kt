package com.movefuel.mufil2.ui.screens.onb

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun ONB015SessionDurationScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "ONB_015",
        title = "Session Duration",
        subtitle = "Workout duration now belongs to the independent Train setup.",
        primaryLabel = "Continue in Train setup",
        primaryRoute = MoveFuelRoute.TRS_011,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.ONB_013,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("20–30 minutes")
            MFOptionCard("30–45 minutes", null, true)
            MFOptionCard("45–60 minutes")
            MFOptionCard("60+ minutes")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun ONB015SessionDurationScreenPreview() {
    MoveFuelTheme { ONB015SessionDurationScreen {} }
}
