package com.movefuel.mufil2.ui.screens.onb

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun ONB014TrainingFrequencyScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "ONB_014",
        title = "Training Frequency",
        subtitle = "Training availability now belongs to the independent Train setup.",
        primaryLabel = "Continue in Train setup",
        primaryRoute = MoveFuelRoute.TRS_008,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.ONB_013,
        onNavigate = onNavigate,
    ) {
            MFField("Training days per week", "3")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun ONB014TrainingFrequencyScreenPreview() {
    MoveFuelTheme { ONB014TrainingFrequencyScreen {} }
}
